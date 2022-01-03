mod utils;

use crate::utils::*;

use near_sdk::{
	// log,
	env, near_bindgen, Balance, AccountId, BorshStorageKey, PanicOnDefault, Promise,
	borsh::{self, BorshDeserialize, BorshSerialize},
	collections::{LookupMap, UnorderedMap, UnorderedSet},
	json_types::{U128},
};

pub const STORAGE_KEY_DELIMETER: char = '|';

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
	AccountToId,
	IdToAccount,
	EventsByName,
    Attendees { event_name: String },
    NetworksByOwner { event_name: String },
    Connections { event_name_and_owner_id: String },
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Network {
	connections: UnorderedSet<u64>,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Event {
	attendees: UnorderedSet<u64>,
	networks_by_owner: LookupMap<AccountId, Network>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
	owner_id: AccountId,
	account_to_id: LookupMap<AccountId, u64>,
	id_to_account: LookupMap<u64, AccountId>,
	last_account_id: u64,
	events_by_name: UnorderedMap<String, Event>,
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
    pub fn create_event(&mut self, event_name: String) {
		let initial_storage_usage = env::storage_usage();

		assert_eq!(env::predecessor_account_id(), self.owner_id, "owner only");
		
        assert!(self.events_by_name.insert(&event_name.clone(), &Event{
			attendees: UnorderedSet::new(StorageKey::Attendees { event_name: event_name.clone() }),
			networks_by_owner: LookupMap::new(StorageKey::NetworksByOwner { event_name }),
		}).is_none(), "event exists");

        refund_deposit(env::storage_usage() - initial_storage_usage);
    }
	
    #[payable]
    pub fn create_connection(&mut self, event_name: String, new_connection_id: AccountId) {
		let initial_storage_usage = env::storage_usage();

		let network_owner_id = env::predecessor_account_id();
		let mut event = self.events_by_name.get(&event_name).expect("no event");
		let mut network = event.networks_by_owner.get(&network_owner_id);
		if network.is_none() {
			network = Some(Network{
				connections: UnorderedSet::new(StorageKey::Connections { event_name_and_owner_id: format!("{}{}{}", event_name, STORAGE_KEY_DELIMETER, network_owner_id.clone()) })
			})
		}
		let mut unwrapped_network = network.unwrap();

		let account_id = self.account_to_id.get(&new_connection_id).unwrap_or({
			self.last_account_id += 1;
			self.account_to_id.insert(&new_connection_id, &self.last_account_id);
			self.id_to_account.insert(&self.last_account_id, &new_connection_id);
			self.last_account_id
		});

		unwrapped_network.connections.insert(&account_id);
		event.attendees.insert(&account_id);
		event.networks_by_owner.insert(&network_owner_id, &unwrapped_network);
		self.events_by_name.insert(&event_name, &event);

        refund_deposit(env::storage_usage() - initial_storage_usage);
    }

	/// views
	
    pub fn get_events(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<String> {
		unordered_map_key_pagination(&self.events_by_name, from_index, limit)
    }

    pub fn get_attendees(&self, event_name: String, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).expect("no event");
		unordered_set_pagination(&event.attendees, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }
	
    pub fn get_connections(&self, event_name: String, network_owner_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<AccountId> {
		let event = self.events_by_name.get(&event_name).expect("no event");
		let network = event.networks_by_owner.get(&network_owner_id).expect("no network");
		unordered_set_pagination(&network.connections, from_index, limit)
			.iter()
			.map(|id| self.id_to_account.get(id).unwrap())
			.collect()
    }
}