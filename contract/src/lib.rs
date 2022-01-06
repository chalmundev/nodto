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
	StringToId,
	IdToString,
	ListsByName,
	ListsByOwnerId,
	ListsByOwnerIdInner { owner_id: Id },
	ListsByHostId,
	ListsByHostIdInner { host_id: Id },
    Guests { list_name: String },
    Hosts { list_name: String },
    HostsInner { list_name_and_host_id: String },
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
pub struct List {
	owner_id: Id,
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
	lists_by_name: UnorderedMap<String, List>,
	lists_by_owner_id: UnorderedMap<Id, UnorderedSet<Id>>,
	lists_by_host_id: UnorderedMap<Id, UnorderedSet<Id>>,
	string_to_id: LookupMap<String, Id>,
	id_to_string: LookupMap<Id, String>,
	last_id: Id,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
			owner_id,
			string_to_id: LookupMap::new(StorageKey::StringToId),
			id_to_string: LookupMap::new(StorageKey::IdToString),
			last_id: 0,
			lists_by_name: UnorderedMap::new(StorageKey::ListsByName),
			lists_by_owner_id: UnorderedMap::new(StorageKey::ListsByOwnerId),
			lists_by_host_id: UnorderedMap::new(StorageKey::ListsByHostId),
        }
    }
	
    #[payable]
    pub fn create_list(
		&mut self,
		list_name: String,
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

		let owner_id = self.add_id(&env::predecessor_account_id().into());
		
        require!(self.lists_by_name.insert(&list_name.clone(), &List{
			owner_id,
			max_invites,
			self_register: self_register.unwrap_or(SELF_REGISTER_DEFAULT),
			difficulty: difficulty.unwrap_or(DIFFICULTY_DEFAULT),
			payment,
			guests: UnorderedSet::new(StorageKey::Guests { list_name: list_name.clone() }),
			hosts: UnorderedMap::new(StorageKey::Hosts { list_name: list_name.clone() }),
		}).is_none(), "list exists");

		let list_id = self.add_id(&list_name);
		let mut lists = self.lists_by_owner_id.get(&owner_id).unwrap_or_else(|| {
			UnorderedSet::new(StorageKey::ListsByOwnerIdInner{ owner_id })
		});
		lists.insert(&list_id);
		self.lists_by_owner_id.insert(&owner_id, &lists);

        refund_deposit(env::storage_usage() - initial_storage_usage, None);
    }

	#[payable]
    pub fn close_list(
		&mut self,
		list_name: String,
	) {
		assert_one_yocto();

		let owner = env::predecessor_account_id();
		let owner_id = self.add_id(&owner.clone().into());
		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		require!(list.owner_id == owner_id, "not list owner");
		
		let hosts_len = list.hosts.len();
		let invited_len = hosts_len * list.max_invites as u64 - list.guests.len();
		let payout = invited_len as u128 * list.payment.amount;
		
		let max_invites = list.max_invites;
		list.max_invites = 0;
		self.lists_by_name.insert(&list_name, &list);

		Promise::new(owner).transfer(payout)
			.then(ext_self::close_list_callback(
				list_name,
				max_invites,
				env::current_account_id(),
				0,
				CALLBACK_GAS,
			));
	}

	pub fn close_list_callback(&mut self, list_name: String, max_invites: Invites) {
		if is_promise_success() {
			return
		}
		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		list.max_invites = max_invites;
		self.lists_by_name.insert(&list_name, &list);
	}

	#[payable]
    pub fn add_host(&mut self, list_name: String, account_id: AccountId) -> Id {
		let initial_storage_usage = env::storage_usage();

		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let owner_id = self.add_id(&env::predecessor_account_id().into());
		require!(list.owner_id == owner_id, "not list owner");

		require!(env::attached_deposit() > list.payment.amount, "must attach payment");

		let host_id = self.add_id(&account_id.into());
		list.hosts.get(&host_id).unwrap_or_else({
			|| {
				let host = Host{
					paid: false,
					guests: UnorderedSet::new(StorageKey::HostsInner { list_name_and_host_id: format!("{}{}{}", list_name, STORAGE_KEY_DELIMETER, host_id) })
				};
				list.hosts.insert(&host_id, &host);
				self.lists_by_name.insert(&list_name, &list);
				host
			}
		});

		let list_id = self.add_id(&list_name);
		let mut lists = self.lists_by_host_id.get(&host_id).unwrap_or_else(|| {
			UnorderedSet::new(StorageKey::ListsByHostIdInner{ host_id })
		});
		lists.insert(&list_id);
		self.lists_by_host_id.insert(&host_id, &lists);

        refund_deposit(env::storage_usage() - initial_storage_usage, Some(list.payment.amount));

		host_id
    }
	
    #[payable]
    pub fn register(&mut self, list_name: String, salt: u64, host_id: Option<u64>) {
		let initial_storage_usage = env::storage_usage();

		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		require!(list.max_invites != 0, "list closed");

		let guest_account_id = env::predecessor_account_id();
		// check PoW
		let mut message = list_name.as_bytes().to_vec();
        message.push(b':');
        message.extend_from_slice(&guest_account_id.as_bytes());
        message.push(b':');
        message.extend_from_slice(&salt.to_le_bytes());
        let hash = env::sha256(&message);
        require!(
            num_leading_zeros(&hash) >= list.difficulty as u32,
            "invalid PoW"
        );

		// no host -> self register
		if host_id.is_none() {
			if !list.self_register {
				env::panic_str("cannot self regiser");
			}
			let guest_id = self.add_id(&guest_account_id.into());
			list.guests.insert(&guest_id);
			self.lists_by_name.insert(&list_name, &list);
			return;
		}

		// host valid
		let host_id = host_id.unwrap();
		let mut host = list.hosts.get(&host_id).expect("not list host");
		require!(host.guests.len() < list.max_invites as u64, "max invited");

		let guest_id = self.add_id(&env::predecessor_account_id().into());
		require!(host.guests.insert(&guest_id), "already invited");
		list.hosts.insert(&host_id, &host);
		list.guests.insert(&guest_id);
		self.lists_by_name.insert(&list_name, &list);

        refund_deposit(env::storage_usage() - initial_storage_usage, None);
    }
	
    pub fn host_withdraw(&mut self, list_name: String) {
		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));

		let account_id = env::predecessor_account_id();
		require!(self.string_to_id.contains_key(&account_id.clone().into()), "no account");
		let host_id = self.add_id(&account_id.clone().into());
		let mut host = list.hosts.get(&host_id).unwrap_or_else(|| env::panic_str("no list"));
		require!(host.paid == false, "already paid");
		host.paid = true;
		list.hosts.insert(&host_id, &host);

		Promise::new(account_id)
			.transfer(u128::from(host.guests.len() as u128 * list.payment.amount))
			.then(ext_self::host_withdraw_callback(
				list_name,
				host_id,
				env::current_account_id(),
				0,
				CALLBACK_GAS,
			));
    }

	pub fn host_withdraw_callback(&mut self, list_name: String, host_id: u64) {
		if is_promise_success() {
			return
		}
		// payment promise failed
		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let mut host = list.hosts.get(&host_id).unwrap_or_else(|| env::panic_str("not host"));
		host.paid = false;
		list.hosts.insert(&host_id, &host);
	}

	/// internal util
	
	pub fn add_id(&mut self, string: &String) -> Id {
		self.string_to_id.get(string).unwrap_or_else({
			|| {
				self.last_id += 1;
				self.string_to_id.insert(string, &self.last_id);
				self.id_to_string.insert(&self.last_id, string);
				self.last_id
			}
		})
    }

	/// views
	
	pub fn get_id(&self, account_id: AccountId) -> Id {
		self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no id"))
    }

    pub fn get_lists(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		unordered_map_key_pagination(&self.lists_by_name, from_index, limit)
    }

	pub fn get_lists_by_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		let owner_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no owner"));
		let lists = self.lists_by_owner_id.get(&owner_id).unwrap_or_else(|| env::panic_str("no lists"));

		unordered_set_pagination(&lists, from_index, limit)
			.iter()
			.map(|id| self.id_to_string.get(id).unwrap())
			.collect()
    }

	pub fn get_lists_by_host(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		let host_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no host"));
		let lists = self.lists_by_host_id.get(&host_id).unwrap_or_else(|| env::panic_str("no lists"));

		unordered_set_pagination(&lists, from_index, limit)
			.iter()
			.map(|id| self.id_to_string.get(id).unwrap())
			.collect()
    }

    pub fn get_hosts(&self, list_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		unordered_map_key_pagination(&list.hosts, from_index, limit)
			.iter()
			.map(|id| self.id_to_string.get(id).unwrap())
			.collect()
    }

    pub fn is_guest(&self, list_name: String, account_id: AccountId) -> bool {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let guest_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no id"));
		list.guests.contains(&guest_id)
    }

    pub fn get_guests(&self, list_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		unordered_set_pagination(&list.guests, from_index, limit)
			.iter()
			.map(|id| self.id_to_string.get(id).unwrap())
			.collect()
    }
	
    pub fn get_host_guests(&self, list_name: String, host_account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let host_id = self.string_to_id.get(&host_account_id.into()).expect("no id");
		let host = list.hosts.get(&host_id).expect("no host");
		unordered_set_pagination(&host.guests, from_index, limit)
			.iter()
			.map(|id| self.id_to_string.get(id).unwrap())
			.collect()
    }

	/// debugging

    pub fn get_list_data(&self, list_name: String) -> Vec<String> {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		vec![
			list.difficulty.to_string(),
			list.max_invites.to_string(),
			list.payment.amount.to_string(),
			list.self_register.to_string(),
		]
    }
}

#[ext_contract(ext_self)]
trait SelfContract {
    fn host_withdraw_callback(&self, list_name: String, host_id: Id);
    fn close_list_callback(&self, list_name: String, max_invites: Invites);
}