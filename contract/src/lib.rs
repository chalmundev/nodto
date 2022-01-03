mod utils;

use crate::utils::*;

use near_sdk::{
	// log,
	env, near_bindgen, Balance, AccountId, BorshStorageKey, PanicOnDefault, Promise,
	borsh::{self, BorshDeserialize, BorshSerialize},
	collections::{LookupMap, UnorderedMap, UnorderedSet},
	json_types::{U128},
};

pub type Id = u64;
pub type Invites = u16;
pub const MAX_INVITES: Invites = Invites::MAX;
pub const GUESTS_CAN_INVITE_DEFAULT: bool = false;
pub const STORAGE_KEY_DELIMETER: char = '|';

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
pub struct Host {
	guests: UnorderedSet<Id>,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Event {
	owner_id: AccountId,
	max_invites: Invites,
	guests_can_invite: bool,
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
    pub fn create_event(&mut self, event_name: String, max_invites: Option<Invites>, guests_can_invite: Option<bool>) {
		let initial_storage_usage = env::storage_usage();

		let max_invites = max_invites.unwrap_or(MAX_INVITES);
		assert!(max_invites > 0, "max_invites == 0");
		
        assert!(self.events_by_name.insert(&event_name.clone(), &Event{
			owner_id: env::predecessor_account_id(),
			max_invites,
			guests_can_invite: guests_can_invite.unwrap_or(GUESTS_CAN_INVITE_DEFAULT),
			guests: UnorderedSet::new(StorageKey::Guests { event_name: event_name.clone() }),
			hosts: UnorderedMap::new(StorageKey::Hosts { event_name }),
		}).is_none(), "event exists");

        refund_deposit(env::storage_usage() - initial_storage_usage);
    }

	#[payable]
    pub fn add_host(&mut self, event_name: String, account_id: AccountId) {
		let initial_storage_usage = env::storage_usage();

		let mut event = self.events_by_name.get(&event_name).expect("no event");
		assert_eq!(event.owner_id, env::predecessor_account_id(), "not event owner");

		let host_id = self.add_account(account_id);
		event.hosts.get(&host_id).unwrap_or_else({
			|| {
				let host = Host{
					guests: UnorderedSet::new(StorageKey::HostsInner { event_name_and_host_id: format!("{}{}{}", event_name, STORAGE_KEY_DELIMETER, host_id) })
				};
				event.hosts.insert(&host_id, &host);
				self.events_by_name.insert(&event_name, &event);
				host
			}
		});

        refund_deposit(env::storage_usage() - initial_storage_usage);
    }
	
    #[payable]
    pub fn add_guest(&mut self, event_name: String, account_id: AccountId) {
		let initial_storage_usage = env::storage_usage();

		let mut event = self.events_by_name.get(&event_name).expect("no event");
		let host_id = self.add_account(env::predecessor_account_id());

		let mut host = event.hosts.get(&host_id).unwrap_or_else({
			|| {
				if event.guests_can_invite {
					Host{
						guests: UnorderedSet::new(StorageKey::HostsInner { event_name_and_host_id: format!("{}{}{}", event_name, STORAGE_KEY_DELIMETER, host_id) })
					}
				} else {
					env::panic_str("not a host, guests cannot invite")
				}
			}
		});

		assert!(host.guests.len() < event.max_invites as u64, "max invited");

		let guest_id = self.add_account(account_id);
		host.guests.insert(&guest_id);
		event.hosts.insert(&host_id, &host);
		event.guests.insert(&guest_id);
		self.events_by_name.insert(&event_name, &event);

        refund_deposit(env::storage_usage() - initial_storage_usage);
    }

	/// utils
	
	pub fn add_account(&mut self, account_id: AccountId) -> Id {
		self.account_to_id.get(&account_id).unwrap_or_else({
			|| {
				self.last_account_id += 1;
				self.account_to_id.insert(&account_id, &self.last_account_id);
				self.id_to_account.insert(&self.last_account_id, &account_id);
				self.last_account_id
			}
		})
    }

	/// views
	
    pub fn get_events(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		unordered_map_key_pagination(&self.events_by_name, from_index, limit)
    }

    pub fn get_hosts(&self, event_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).expect("no event");
		unordered_map_key_pagination(&event.hosts, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }

    pub fn get_guests(&self, event_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).expect("no event");
		unordered_set_pagination(&event.guests, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }
	
    pub fn get_host_guests(&self, event_name: String, host_account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).expect("no event");
		let host_id = self.account_to_id.get(&host_account_id).expect("no host");
		let host = event.hosts.get(&host_id).expect("no network");
		unordered_set_pagination(&host.guests, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }
}