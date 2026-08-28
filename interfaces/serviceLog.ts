import { MaintenancePartKey } from './bike';

export interface IServiceLog {
  id?: string;
  bikeId?: string;
  part: string;
  partKey?: MaintenancePartKey | string;
  price: number;
  note: string;
  createdAt: number;
  odoAtService: number;
  shopName?: string;
}

