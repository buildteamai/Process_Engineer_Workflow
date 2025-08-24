

export interface Parameter {
  value: string;
}

export interface CustomerInfo {
    name: Parameter;
    location: Parameter;
    contactPerson: Parameter;
}

export interface FanMotorData {
    hz?: Parameter;
    hp?: Parameter;
    fla?: Parameter;
    rpm?: Parameter;
}

export interface DuctworkData {
    airflow: Parameter;
    staticPressure?: Parameter; // S.P
    ductLength: Parameter;
    ductWidth: Parameter;
    velocity: Parameter;
}

export interface AirSystemData extends DuctworkData, FanMotorData {}

export interface ChilledWaterCoilData {
    tempIn: Parameter;
    pressureIn: Parameter;
    tempOut: Parameter;
    pressureOut: Parameter;
}

// Sub-System Data Interfaces
export interface HeaterBoxData {
    burnerRating: Parameter;
    combustionFan?: FanMotorData;
    circulationFan?: FanMotorData;
}

export interface CoolerData {
    chilledWaterCoil: ChilledWaterCoilData;
    fanMotor?: FanMotorData;
}

export interface AirSupplyHouseData {
    airSystem: AirSystemData;
}

// Discriminated union for SubSystems
export type SubSystem = {
    id: string;
    name: string;
} & (
    | { type: 'HeaterBox'; data: HeaterBoxData }
    | { type: 'Cooler'; data: CoolerData }
    | { type: 'AirSupplyHouse'; data: AirSupplyHouseData }
);

export interface AirLeakageData {
  volume: Parameter;
  silhouetteSize: Parameter;
}

export interface ZoneData {
  design: 'Booth' | 'Heated' | 'Cooled' | 'Ambient';
  temperature: Parameter;
  relativeHumidity: Parameter;
  supply: DuctworkData;
  exhaust: DuctworkData;
  infiltration?: AirLeakageData;
  exfiltration?: AirLeakageData;
  zoneLength: Parameter;
  internalWidth: Parameter;
  internalHeight: Parameter;
  purpose?: Parameter;
  notes?: Parameter;
}

export interface Zone {
  id: string;
  name: string;
  data: ZoneData;
  subSystems: SubSystem[];
}

export interface ProcessData {
  customerInfo: CustomerInfo;
  collectionDate: Parameter;
  productSize: 'Car' | 'SUV' | '';
  conveyorSpeed: Parameter;
  zones: Zone[];
  timeOfDay?: Parameter;
  outsideTemperature?: Parameter;
  outsideRelativeHumidity?: Parameter;
}

export interface Trend {
  parameter: string;
  zone: string;
  trendDescription: string;
  prediction: string;
}

export interface AIAnalysis {
  overallStatus: 'In-Compliance' | 'Warning' | 'Critical';
  faults: {
    parameter: string;
    zone: string;
    baselineValue: string;
    currentValue: string;
    deviation: string;
  }[];
  rootCauseAnalysis: {
    cause: string;
    reasoning: string;
    recommendation: string;
  }[];
  trendAnalysis: Trend[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChangeRequest {
  id: string;
  title: string;
  justification: string;
  recommendedAction: string;
  expectedResults: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskDetails: string;
  estimatedCost: string;
  status: 'Draft' | 'Pending Approval' | 'Approved';
}