import type { ProcessData, Zone } from './types';

export const NEW_ZONE_TEMPLATE: Omit<Zone, 'id'> = {
  name: 'New Stage',
  data: {
    design: 'Heated' as const,
    temperature: { value: '' },
    relativeHumidity: { value: '' },
    supply: {
        airflow: { value: '' },
        staticPressure: { value: '' },
        ductLength: { value: '' },
        ductWidth: { value: '' },
        velocity: { value: '' },
    },
    exhaust: {
        airflow: { value: '' },
        staticPressure: { value: '' },
        ductLength: { value: '' },
        ductWidth: { value: '' },
        velocity: { value: '' },
    },
    infiltration: {
        volume: { value: '' },
        silhouetteSize: { value: '' },
    },
    exfiltration: {
        volume: { value: '' },
        silhouetteSize: { value: '' },
    },
    zoneLength: { value: '' },
    internalWidth: { value: '' },
    internalHeight: { value: '' },
    purpose: { value: '' },
    notes: { value: '' },
  },
  subSystems: []
};

// A blank data structure for initializing the application state.
export const BLANK_PROCESS_DATA: ProcessData = {
    customerInfo: {
        name: { value: '' },
        location: { value: '' },
        contactPerson: { value: '' },
    },
    collectionDate: { value: new Date().toISOString().split('T')[0] },
    productSize: '',
    conveyorSpeed: { value: '' },
    zones: [],
    timeOfDay: { value: '' },
    outsideTemperature: { value: '' },
    outsideRelativeHumidity: { value: '' },
};

// This is not directly used for app initialization but is kept for consistency.
export const INITIAL_PROCESS_DATA: ProcessData[] = [
    JSON.parse(JSON.stringify(BLANK_PROCESS_DATA))
];