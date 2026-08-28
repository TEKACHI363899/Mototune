import type { ComponentType } from 'react';

export type MaintenanceCategoryKey =
  | 'engine'
  | 'transmission'
  | 'brakes_tires'
  | 'chassis_suspension'
  | 'electrical';

export type MaintenancePartKey =
  // 1. Dong co & Dung dich (Engine & Fluids)
  | 'oil'
  | 'oilFilter'
  | 'airFilter'
  | 'sparkPlug'
  | 'coolant'
  | 'fuelInjector'
  // 2. He thong truyen dong (Drivetrain & Transmission)
  | 'chain'
  | 'belt'
  | 'gearOil'
  | 'clutch'
  | 'rollers'
  // 3. Phanh & An toan (Brakes & Safety)
  | 'frontBrake'
  | 'rearBrake'
  | 'brakeFluid'
  | 'brakeRotor'
  // 4. Lop & Khung gam - Giam xoc (Tires & Suspension)
  | 'frontTire'
  | 'rearTire'
  | 'frontFork'
  | 'rearShock'
  | 'steeringBearing'
  // 5. He thong dien & Phu tro (Electrical & Controls)
  | 'battery'
  | 'headlight'
  | 'cables'
  // Legacy aliases
  | 'brakes';

export interface IMaintenanceStatus {
  // Legacy 6 keys
  oil?: number;
  airFilter?: number;
  sparkPlug?: number;
  coolant?: number;
  chain?: number;
  brakes?: number;

  // Category 1: Engine & Fluids
  oilFilter?: number;
  fuelInjector?: number;

  // Category 2: Drivetrain & Transmission
  belt?: number;
  gearOil?: number;
  clutch?: number;
  rollers?: number;

  // Category 3: Brakes & Safety
  frontBrake?: number;
  rearBrake?: number;
  brakeFluid?: number;
  brakeRotor?: number;

  // Category 4: Tires & Suspension
  frontTire?: number;
  rearTire?: number;
  frontFork?: number;
  rearShock?: number;
  steeringBearing?: number;

  // Category 5: Electrical & Controls
  battery?: number;
  headlight?: number;
  cables?: number;

  // Extensible index signature
  [key: string]: number | undefined;
}

export interface IBike {
  id: string;
  brand: string;
  model: string;
  nickname: string;
  odo: number;
  maintenance?: IMaintenanceStatus;
  lastOilChangeOdo?: number;
  aiCutoutUrl?: string;
}

export interface IMaintenanceCategoryMeta {
  key: MaintenanceCategoryKey | 'all';
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
}

export interface IMaintenancePart {
  id: MaintenancePartKey;
  name: string;
  category: MaintenanceCategoryKey;
  interval: number;
  icon: ComponentType<{ size?: number; color?: string }>;
  description?: string;
}
