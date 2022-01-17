mod utils;
use crate::utils::*;

use near_sdk::{
	// log,
	require,
	env, near_bindgen, ext_contract, Gas, Balance, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseResult,
	borsh::{self, BorshDeserialize, BorshSerialize},
	collections::{LookupMap, UnorderedMap, UnorderedSet},
	json_types::U128,
	assert_one_yocto,
};

pub type Id = u64;
pub type Invites = u16;
pub const MAX_INVITES: Invites = Invites::MAX;
pub const OPEN_REGISTER_DEFAULT: bool = true;
pub const DIFFICULTY_DEFAULT: u8 = 20;
pub const STORAGE_KEY_DELIMETER: char = '|';
pub const PAYMENT_TOKEN_ID_DEFAULT: &str = "near";
pub const PAYMENT_AMOUNT_DEFAULT: u128 = 0;
pub const CALLBACK_GAS: Gas = Gas(10_000_000_000_000);

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
	StringToId,
	IdToString,
	ListsByName,
	ListsByOwnerId,
	ListsByOwnerIdInner { owner_id: Id },
	ListsByInviterId,
	ListsByInviterIdInner { inviter_id: Id },
    Invitees { list_name: String },
    Inviters { list_name: String },
    InvitersInner { list_name_and_inviter_id: String },
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Payment {
	token_id: String,
	amount: u128,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Inviter {
	paid: bool,
	invitees: UnorderedSet<Id>,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct List {
	owner_id: Id,
	max_invites: Invites,
	open_register: bool,
	difficulty: u8,
	payment: Payment,
	image: String,
	invitees: UnorderedSet<Id>,
	inviters: UnorderedMap<Id, Inviter>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
	owner_id: AccountId,
	lists_by_name: UnorderedMap<String, List>,
	lists_by_owner_id: UnorderedMap<Id, UnorderedSet<Id>>,
	lists_by_inviter_id: UnorderedMap<Id, UnorderedSet<Id>>,
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
			lists_by_inviter_id: UnorderedMap::new(StorageKey::ListsByInviterId),
        }
    }
	
    #[payable]
    pub fn create_list(
		&mut self,
		list_name: String,
		max_invites: Option<Invites>,
		payment_amount: Option<U128>,
		open_register: Option<bool>,
		image: Option<String>,
		difficulty: Option<u8>,
	) {
		let initial_storage_usage = env::storage_usage();

		let mut payment = Payment{
			token_id: PAYMENT_TOKEN_ID_DEFAULT.to_string(),
			amount: PAYMENT_AMOUNT_DEFAULT,
		};
		if let Some(payment_amount) = payment_amount {
			payment.amount = payment_amount.0;
		}
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
			open_register: open_register.unwrap_or_else(|| OPEN_REGISTER_DEFAULT),
			difficulty: difficulty.unwrap_or_else(|| DIFFICULTY_DEFAULT),
			image: image.unwrap_or_else(|| "".to_string()),
			payment,
			invitees: UnorderedSet::new(StorageKey::Invitees { list_name: list_name.clone() }),
			inviters: UnorderedMap::new(StorageKey::Inviters { list_name: list_name.clone() }),
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
		
		let max_invites = list.max_invites;
		list.max_invites = 0;
		self.lists_by_name.insert(&list_name, &list);

		// no payout to owner because there was never a payment amount
		if list.payment.amount == 0 {
			return
		}
		
		// calc payout to owner
		let inviters_len = list.inviters.len();
		let invited_len = (inviters_len * list.max_invites as u64).checked_sub(list.invitees.len()).unwrap_or_else(|| 0);
		let payout = invited_len as u128 * list.payment.amount;
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
    pub fn add_inviter(&mut self, list_name: String, account_id: AccountId) -> Id {
		let initial_storage_usage = env::storage_usage();

		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let owner_id = self.add_id(&env::predecessor_account_id().into());
		require!(list.owner_id == owner_id, "not list owner");

		require!(env::attached_deposit() > list.payment.amount, "must attach payment");

		let inviter_id = self.add_id(&account_id.into());
		list.inviters.get(&inviter_id).unwrap_or_else({
			|| {
				let inviter = Inviter{
					paid: false,
					invitees: UnorderedSet::new(StorageKey::InvitersInner { list_name_and_inviter_id: format!("{}{}{}", list_name, STORAGE_KEY_DELIMETER, inviter_id) })
				};
				list.inviters.insert(&inviter_id, &inviter);
				self.lists_by_name.insert(&list_name, &list);
				inviter
			}
		});

		let list_id = self.add_id(&list_name);
		let mut lists = self.lists_by_inviter_id.get(&inviter_id).unwrap_or_else(|| {
			UnorderedSet::new(StorageKey::ListsByInviterIdInner{ inviter_id })
		});
		lists.insert(&list_id);
		self.lists_by_inviter_id.insert(&inviter_id, &lists);

        refund_deposit(env::storage_usage() - initial_storage_usage, Some(list.payment.amount));

		inviter_id
    }
	
    #[payable]
    pub fn register(&mut self, list_name: String, salt: u64, inviter_id: Option<u64>) {
		let initial_storage_usage = env::storage_usage();

		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		require!(list.max_invites != 0, "list closed");

		let invitee_account_id = env::predecessor_account_id();
		// check PoW
		let mut message = list_name.as_bytes().to_vec();
        message.push(b':');
        message.extend_from_slice(&invitee_account_id.as_bytes());
        message.push(b':');
        message.extend_from_slice(&salt.to_le_bytes());
        let hash = env::sha256(&message);
        require!(
            num_leading_zeros(&hash) >= list.difficulty as u32,
            "invalid PoW"
        );

		// no inviter -> self register
		if inviter_id.is_none() {
			if !list.open_register {
				env::panic_str("cannot self regiser");
			}
			let invitee_id = self.add_id(&invitee_account_id.into());
			list.invitees.insert(&invitee_id);
			self.lists_by_name.insert(&list_name, &list);
			return;
		}

		// inviter valid
		let inviter_id = inviter_id.unwrap();
		let mut inviter = list.inviters.get(&inviter_id).expect("not list inviter");
		require!(inviter.invitees.len() < list.max_invites as u64, "max invited");

		let invitee_id = self.add_id(&env::predecessor_account_id().into());
		require!(inviter.invitees.insert(&invitee_id), "already invited");
		list.inviters.insert(&inviter_id, &inviter);
		list.invitees.insert(&invitee_id);
		self.lists_by_name.insert(&list_name, &list);

        refund_deposit(env::storage_usage() - initial_storage_usage, None);
    }
	
    pub fn inviter_withdraw(&mut self, list_name: String) {
		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));

		// no payout
		if list.payment.amount == 0 {
			env::log_str("no payment amount");
			return;
		}

		let account_id = env::predecessor_account_id();
		require!(self.string_to_id.contains_key(&account_id.clone().into()), "no account");
		let inviter_id = self.add_id(&account_id.clone().into());
		let mut inviter = list.inviters.get(&inviter_id).unwrap_or_else(|| env::panic_str("no list"));
		require!(inviter.paid == false, "already paid");
		inviter.paid = true;
		list.inviters.insert(&inviter_id, &inviter);

		Promise::new(account_id)
			.transfer(u128::from(inviter.invitees.len() as u128 * list.payment.amount))
			.then(ext_self::inviter_withdraw_callback(
				list_name,
				inviter_id,
				env::current_account_id(),
				0,
				CALLBACK_GAS,
			));
    }

	pub fn inviter_withdraw_callback(&mut self, list_name: String, inviter_id: u64) {
		if is_promise_success() {
			return
		}
		// payment promise failed
		let mut list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let mut inviter = list.inviters.get(&inviter_id).unwrap_or_else(|| env::panic_str("not inviter"));
		inviter.paid = false;
		list.inviters.insert(&inviter_id, &inviter);
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

    pub fn get_lists(&self, from_index: Option<U128>, limit: Option<u64>) -> (u64, Vec<String>) {
		(self.lists_by_name.len(), unordered_map_key_pagination(&self.lists_by_name, from_index, limit))
    }

	pub fn get_lists_by_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> (u64, Vec<String>) {
		let owner_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no owner"));
		let lists = self.lists_by_owner_id.get(&owner_id).unwrap_or_else(|| env::panic_str("no lists"));
		(
			lists.len(),
			unordered_set_pagination(&lists, from_index, limit)
				.iter()
				.map(|id| self.id_to_string.get(id).unwrap())
				.collect()
		)
    }

	pub fn get_lists_by_inviter(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> (u64, Vec<String>) {
		let inviter_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no inviter"));
		let lists = self.lists_by_inviter_id.get(&inviter_id).unwrap_or_else(|| env::panic_str("no lists"));

		(
			lists.len(),
			unordered_set_pagination(&lists, from_index, limit)
			.iter()
			.map(|id| self.id_to_string.get(id).unwrap())
			.collect()
		)
    }

    pub fn get_inviters(&self, list_name: String, from_index: Option<U128>, limit: Option<u64>) -> (u64, Vec<String>) {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		(
			list.inviters.len(),
			unordered_map_key_pagination(&list.inviters, from_index, limit)
				.iter()
				.map(|id| self.id_to_string.get(id).unwrap())
				.collect()
		)
    }

    pub fn get_invitees(&self, list_name: String, from_index: Option<U128>, limit: Option<u64>) -> (u64, Vec<String>) {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		(
			list.invitees.len(),
			unordered_set_pagination(&list.invitees, from_index, limit)
				.iter()
				.map(|id| self.id_to_string.get(id).unwrap())
				.collect()
		)
    }
	
    pub fn get_inviter_invitees(&self, list_name: String, inviter_account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> (u64, Vec<String>) {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let inviter_id = self.string_to_id.get(&inviter_account_id.into()).expect("no id");
		let inviter = list.inviters.get(&inviter_id).expect("no inviter");
		(
			inviter.invitees.len(),
			unordered_set_pagination(&inviter.invitees, from_index, limit)
				.iter()
				.map(|id| self.id_to_string.get(id).unwrap())
				.collect()
		)
    }

    pub fn is_inviter(&self, list_name: String, account_id: AccountId) -> bool {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let inviter_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no id"));
		if list.inviters.get(&inviter_id).is_some() {
			true
		} else {
			false
		}
    }

    pub fn is_invitee(&self, list_name: String, account_id: AccountId) -> bool {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		let invitee_id = self.string_to_id.get(&account_id.into()).unwrap_or_else(|| env::panic_str("no id"));
		list.invitees.contains(&invitee_id)
    }

	/// debugging

    pub fn get_list_data(&self, list_name: String) -> Vec<String> {
		let list = self.lists_by_name.get(&list_name).unwrap_or_else(|| env::panic_str("no list"));
		vec![
			list.owner_id.to_string(),
			list.max_invites.to_string(),
			list.payment.amount.to_string(),
			list.open_register.to_string(),
			list.difficulty.to_string(),
			list.image.to_string(),
		]
    }
}

#[ext_contract(ext_self)]
trait SelfContract {
    fn inviter_withdraw_callback(&self, list_name: String, inviter_id: Id);
    fn close_list_callback(&self, list_name: String, max_invites: Invites);
}