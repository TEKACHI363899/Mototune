import { Droplet, Disc, Wind, Zap, Settings, Thermometer } from 'lucide-react-native';
import { IMaintenancePart } from '../interfaces/bike';

export interface IBikeCategory {
  categoryName: string;
  models: string[];
}

export const BIKE_DATA: Record<string, IBikeCategory[]> = {
  "Honda": [
    {
      categoryName: "Xe số & Xe côn tay",
      models: [
        "Honda Wave Alpha",
        "Honda Wave RSX",
        "Honda Blade",
        "Honda Future",
        "Honda Winner X",
        "Honda Dream",
        "Honda Wave Thái / Future Neo (đời cũ)"
      ]
    },
    {
      categoryName: "Xe tay ga",
      models: [
        "Honda Vision",
        "Honda Air Blade (AB)",
        "Honda Vario (125, 150, 160)",
        "Honda Lead",
        "Honda SH (125i, 150i, 160i, 350i)",
        "Honda SH Mode",
        "Honda PCX"
      ]
    },
    {
      categoryName: "Xe nhập khẩu & Xe chơi (Classic / Cào cào)",
      models: [
        "Honda Scoopy",
        "Honda Giorno",
        "Honda Super Cub (C125)",
        "Honda Monkey",
        "Honda Dax ST125",
        "Honda XR150 / CRF150L (Cào cào)"
      ]
    },
    {
      categoryName: "Xe Mô tô / Phân khối lớn (PKL) phổ biến",
      models: [
        "Honda CBR150R",
        "Honda CB150R",
        "Honda CBR500R / CB500F / CB500X (NX500)",
        "Honda CB650R / CBR650R",
        "Honda Rebel 300 / Rebel 500"
      ]
    }
  ],
  "Yamaha": [
    {
      categoryName: "Xe số & Xe côn tay",
      models: [
        "Yamaha Sirius (Xăng cơ & FI)",
        "Yamaha Jupiter (Finn, Elegance, Gravita)",
        "Yamaha Exciter (135, 150, 155 VVA)",
        "Yamaha Taurus"
      ]
    },
    {
      categoryName: "Xe tay ga",
      models: [
        "Yamaha Grande",
        "Yamaha Janus",
        "Yamaha Latte",
        "Yamaha NVX (Aerox)",
        "Yamaha FreeGo",
        "Yamaha Lexi 155",
        "Yamaha Nouvo (đời cũ: LX, SX...)",
        "Yamaha Luvias",
        "Yamaha Nozza / Cuxi"
      ]
    },
    {
      categoryName: "Xe nhập khẩu & Xe chơi (Classic / Cào cào)",
      models: [
        "Yamaha PG-1",
        "Yamaha FZ150i / TFX 150",
        "Yamaha XS155R (XSR 155)",
        "Yamaha YZ125 / WR155R (Cào cào)"
      ]
    },
    {
      categoryName: "Xe Mô tô / Phân khối lớn (PKL) phổ biến",
      models: [
        "Yamaha YZF-R15 / MT-15",
        "Yamaha YZF-R3 / MT-03",
        "Yamaha YZF-R7 / MT-07",
        "Yamaha MT-09 / Tracer 9"
      ]
    }
  ],
  "Suzuki": [
    {
      categoryName: "Xe số & Xe côn tay (Phổ thông & Thể thao)",
      models: [
        "Suzuki Viva (đời cũ & FI)",
        "Suzuki Revo / Smash",
        "Suzuki Axelo 125",
        "Suzuki Raider R150 (FI & Xăng cơ)",
        "Suzuki Satria F150",
        "Suzuki FXR 150"
      ]
    },
    {
      categoryName: "Xe 2 thì (Huyền thoại đời cũ)",
      models: [
        "Suzuki Sport (Su Xì-po: RG Sport 110, RGV 120, RGX 120)",
        "Suzuki Satria 120",
        "Suzuki Stinger 120"
      ]
    },
    {
      categoryName: "Xe tay ga",
      models: [
        "Suzuki Hayate 125",
        "Suzuki Impulse 125",
        "Suzuki UA 125 / Skydrive",
        "Suzuki Bella / Amity",
        "Suzuki Burgman Street"
      ]
    },
    {
      categoryName: "Xe Cruiser, Classic & Cào cào phổ thông",
      models: [
        "Suzuki GZ150-A / GZ125",
        "Suzuki GD110",
        "Suzuki HJ125",
        "Suzuki EN150-A",
        "Suzuki DR-Z125 / Bandit 150"
      ]
    },
    {
      categoryName: "Xe Mô tô / Phân khối lớn (PKL) phổ biến",
      models: [
        "Suzuki GSX-R150 / GSX-S150",
        "Suzuki V-Strom 250 / V-Strom 1050",
        "Suzuki SV650",
        "Suzuki GSX-S750 / GSX-S1000",
        "Suzuki Katana",
        "Suzuki Hayabusa (\"Thần gió\")"
      ]
    }
  ]
};

export const BRANDS: string[] = Object.keys(BIKE_DATA);

export const MAINTENANCE_PARTS: IMaintenancePart[] = [
  { id: 'oil', name: 'Nhớt máy', interval: 2000, icon: Droplet },
  { id: 'brakes', name: 'Bố thắng', interval: 10000, icon: Disc },
  { id: 'airFilter', name: 'Lọc gió', interval: 10000, icon: Wind },
  { id: 'sparkPlug', name: 'Bugi', interval: 10000, icon: Zap },
  { id: 'chain', name: 'Sên dĩa (NSD)', interval: 15000, icon: Settings },
  { id: 'coolant', name: 'Nước mát', interval: 15000, icon: Thermometer },
];
