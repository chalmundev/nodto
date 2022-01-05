mod utils;
use crate::utils::*;

use near_sdk::{
	// log,
	require,
	env, near_bindgen, ext_contract, Gas, Balance, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseResult,
	borsh::{self, BorshDeserialize, BorshSerialize},
	collections::{LookupMap, UnorderedMap, UnorderedSet},
	json_types::U128, assert_one_yocto,
};

pub type Id = u64;
pub type Invites = u16;
pub const MAX_INVITES: Invites = Invites::MAX;
pub const SELF_REGISTER_DEFAULT: bool = false;
pub const DIFFICULTY_DEFAULT: u8 = 20;
pub const STORAGE_KEY_DELIMETER: char = '|';
pub const PAYMENT_TOKEN_ID_DEFAULT: &str = "near";
pub const PAYMENT_AMOUNT_DEFAULT: u128 = 100_000_000_000_000_000_000_000; // 0.1 N
pub const CALLBACK_GAS: Gas = Gas(10_000_000_000_000);

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
	AccountToId,
	IdToAccount,
	EventsByName,
    Guests { event_name: String },
    Hosts { event_name: String },
    HostsInner { event_name_and_host_id: String },
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Payment {
	token_id: String,
	amount: u128,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Host {
	paid: bool,
	guests: UnorderedSet<Id>,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Event {
	owner_id: AccountId,
	max_invites: Invites,
	self_register: bool,
	difficulty: u8,
	payment: Payment,
	guests: UnorderedSet<Id>,
	hosts: UnorderedMap<Id, Host>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
	owner_id: AccountId,
	events_by_name: UnorderedMap<String, Event>,
	account_to_id: LookupMap<AccountId, Id>,
	id_to_account: LookupMap<Id, AccountId>,
	last_account_id: Id,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
			owner_id,
			account_to_id: LookupMap::new(StorageKey::AccountToId),
			id_to_account: LookupMap::new(StorageKey::IdToAccount),
			last_account_id: 0,
			events_by_name: UnorderedMap::new(StorageKey::EventsByName),
        }
    }
	
    #[payable]
    pub fn create_event(
		&mut self,
		event_name: String,
		max_invites: Option<Invites>,
		self_register: Option<bool>,
		difficulty: Option<u8>,
	) {
		let initial_storage_usage = env::storage_usage();

		let mut payment = Payment{
			token_id: PAYMENT_TOKEN_ID_DEFAULT.to_string(),
			amount: PAYMENT_AMOUNT_DEFAULT,
		};
		let max_invites = max_invites.unwrap_or_else({
			|| {
				payment.amount = 0;
				MAX_INVITES
			}
		});
		require!(max_invites > 0, "max_invites == 0");
		
        require!(self.events_by_name.insert(&event_name.clone(), &Event{
			owner_id: env::predecessor_account_id(),
			max_invites,
			self_register: self_register.unwrap_or(SELF_REGISTER_DEFAULT),
			difficulty: difficulty.unwrap_or(DIFFICULTY_DEFAULT),
			payment,
			guests: UnorderedSet::new(StorageKey::Guests { event_name: event_name.clone() }),
			hosts: UnorderedMap::new(StorageKey::Hosts { event_name }),
		}).is_none(), "event exists");

        refund_deposit(env::storage_usage() - initial_storage_usage, None);
    }

	#[payable]
    pub fn close_event(
		&mut self,
		event_name: String,
	) {
		assert_one_yocto();

		let owner_id = env::predecessor_account_id();
		let mut event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		require!(event.owner_id == owner_id, "not event owner");
		
		let hosts_len = event.hosts.len();
		let invited_len = hosts_len * event.max_invites as u64 - event.guests.len();
		let payout = invited_len as u128 * event.payment.amount;
		
		let max_invites = event.max_invites;
		event.max_invites = 0;
		self.events_by_name.insert(&event_name, &event);

		Promise::new(owner_id).transfer(payout)
			.then(ext_self::close_event_callback(
				event_name,
				max_invites,
				env::current_account_id(),
				0,
				CALLBACK_GAS,
			));
	}

	pub fn close_event_callback(&mut self, event_name: String, max_invites: Invites) {
		if is_promise_success() {
			return
		}
		let mut event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		event.max_invites = max_invites;
		self.events_by_name.insert(&event_name, &event);
	}

	#[payable]
    pub fn add_host(&mut self, event_name: String, account_id: AccountId) -> Id {
		let initial_storage_usage = env::storage_usage();

		let mut event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		require!(event.owner_id == env::predecessor_account_id(), "not event owner");

		require!(env::attached_deposit() > event.payment.amount, "must attach payment");

		let host_id = self.add_host_id(&account_id);
		event.hosts.get(&host_id).unwrap_or_else({
			|| {
				let host = Host{
					paid: false,
					guests: UnorderedSet::new(StorageKey::HostsInner { event_name_and_host_id: format!("{}{}{}", event_name, STORAGE_KEY_DELIMETER, host_id) })
				};
				event.hosts.insert(&host_id, &host);
				self.events_by_name.insert(&event_name, &event);
				host
			}
		});

        refund_deposit(env::storage_usage() - initial_storage_usage, Some(event.payment.amount));

		host_id
    }
	
    #[payable]
    pub fn register(&mut self, event_name: String, salt: u64, host_id: Option<u64>) {
		let initial_storage_usage = env::storage_usage();

		let mut event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		require!(event.max_invites != 0, "event closed");

		let guest_account_id = env::predecessor_account_id();
		// check PoW
		let mut message = event_name.as_bytes().to_vec();
        message.push(b':');
        message.extend_from_slice(&guest_account_id.as_bytes());
        message.push(b':');
        message.extend_from_slice(&salt.to_le_bytes());
        let hash = env::sha256(&message);
        require!(
            num_leading_zeros(&hash) >= event.difficulty as u32,
            "invalid PoW"
        );

		// no host -> self register
		if host_id.is_none() {
			if !event.self_register {
				env::panic_str("cannot self regiser");
			}
			let guest_id = self.add_host_id(&guest_account_id);
			event.guests.insert(&guest_id);
			self.events_by_name.insert(&event_name, &event);
			return;
		}

		// host valid
		let host_id = host_id.unwrap();
		let mut host = event.hosts.get(&host_id).expect("not event host");
		require!(host.guests.len() < event.max_invites as u64, "max invited");

		let guest_id = self.add_host_id(&env::predecessor_account_id());
		require!(host.guests.insert(&guest_id), "already invited");
		event.hosts.insert(&host_id, &host);
		event.guests.insert(&guest_id);
		self.events_by_name.insert(&event_name, &event);

        refund_deposit(env::storage_usage() - initial_storage_usage, None);
    }
	
    pub fn host_withdraw(&mut self, event_name: String) {
		let mut event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));

		let account_id = env::predecessor_account_id();
		require!(self.account_to_id.contains_key(&account_id), "no account");
		let host_id = self.add_host_id(&account_id);
		let mut host = event.hosts.get(&host_id).unwrap_or_else(|| env::panic_str("no event"));
		require!(host.paid == false, "already paid");
		host.paid = true;
		event.hosts.insert(&host_id, &host);

		Promise::new(account_id)
			.transfer(u128::from(host.guests.len() as u128 * event.payment.amount))
			.then(ext_self::host_withdraw_callback(
				event_name,
				host_id,
				env::current_account_id(),
				0,
				CALLBACK_GAS,
			));
    }

	pub fn host_withdraw_callback(&mut self, event_name: String, host_id: u64) {
		if is_promise_success() {
			return
		}
		// payment promise failed
		let mut event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		let mut host = event.hosts.get(&host_id).unwrap_or_else(|| env::panic_str("not host"));
		host.paid = false;
		event.hosts.insert(&host_id, &host);
	}

	/// utils
	
	pub fn add_host_id(&mut self, account_id: &AccountId) -> Id {
		self.account_to_id.get(account_id).unwrap_or_else({
			|| {
				self.last_account_id += 1;
				self.account_to_id.insert(&account_id, &self.last_account_id);
				self.id_to_account.insert(&self.last_account_id, &account_id);
				self.last_account_id
			}
		})
    }

	/// views
	
	pub fn get_host_id(&self, account_id: &AccountId) -> Id {
		self.account_to_id.get(account_id).unwrap_or_else(|| env::panic_str("no id"))
    }

    pub fn get_events(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		unordered_map_key_pagination(&self.events_by_name, from_index, limit)
    }

    pub fn get_hosts(&self, event_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		unordered_map_key_pagination(&event.hosts, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }

    pub fn is_guest(&self, event_name: String, account_id: &AccountId) -> bool {
		let event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		let guest_id = self.account_to_id.get(account_id).unwrap_or_else(|| env::panic_str("no id"));
		event.guests.contains(&guest_id)
    }

    pub fn get_guests(&self, event_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		unordered_set_pagination(&event.guests, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }
	
    pub fn get_host_guests(&self, event_name: String, host_account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		let host_id = self.account_to_id.get(&host_account_id).expect("no id");
		let host = event.hosts.get(&host_id).expect("no host");
		unordered_set_pagination(&host.guests, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }

	/// debugging

    pub fn get_event_data(&self, event_name: String) -> Vec<String> {
		let event = self.events_by_name.get(&event_name).unwrap_or_else(|| env::panic_str("no event"));
		vec![
			event.difficulty.to_string(),
			event.max_invites.to_string(),
			event.payment.amount.to_string(),
			event.self_register.to_string(),
		]
    }
}

#[ext_contract(ext_self)]
trait SelfContract {
    fn host_withdraw_callback(&self, event_name: String, host_id: Id);
    fn close_event_callback(&self, event_name: String, max_invites: Invites);
}