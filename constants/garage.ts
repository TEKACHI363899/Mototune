import {
  Droplet,
  Filter,
  Wind,
  Zap,
  Thermometer,
  Settings,
  Repeat,
  Disc,
  Fuel,
  ShieldAlert,
  CircleDot,
  Droplets,
  Activity,
  Sliders,
  Compass,
  BatteryCharging,
  Lightbulb,
  Cpu,
  Wrench,
  Gauge,
} from 'lucide-react-native';
import {
  IMaintenancePart,
  IMaintenanceStatus,
  IMaintenanceCategoryMeta,
} from '../interfaces/bike';

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

export const DEFAULT_MAINTENANCE_STATUS: IMaintenanceStatus = {
  oil: 0,
  oilFilter: 0,
  airFilter: 0,
  sparkPlug: 0,
  coolant: 0,
  fuelInjector: 0,
  chain: 0,
  belt: 0,
  clutch: 0,
  gearOil: 0,
  rollers: 0,
  frontBrake: 0,
  rearBrake: 0,
  brakeFluid: 0,
  brakeRotor: 0,
  frontTire: 0,
  rearTire: 0,
  frontFork: 0,
  rearShock: 0,
  steeringBearing: 0,
  battery: 0,
  headlight: 0,
  cables: 0,
};

export const MAINTENANCE_CATEGORIES: IMaintenanceCategoryMeta[] = [
  { key: 'all', label: 'Tất cả', icon: Wrench },
  { key: 'engine', label: 'Động cơ & Dung dịch', icon: Gauge },
  { key: 'transmission', label: 'Hệ thống truyền động', icon: Settings },
  { key: 'brakes_tires', label: 'Phanh & Lốp xe', icon: ShieldAlert },
  { key: 'chassis_suspension', label: 'Khung gầm & Giảm xóc', icon: Compass },
  { key: 'electrical', label: 'Hệ thống điện & Phụ trợ', icon: BatteryCharging },
];

export const MAINTENANCE_PARTS: IMaintenancePart[] = [
  // 1. Động cơ & Dung dịch (Engine & Fluids)
  {
    id: 'oil',
    name: 'Nhớt máy',
    category: 'engine',
    interval: 2000,
    icon: Droplet,
    description: 'Bôi trơn, làm mát và làm sạch các chi tiết động cơ.',
  },
  {
    id: 'oilFilter',
    name: 'Lọc nhớt',
    category: 'engine',
    interval: 6000,
    icon: Filter,
    description: 'Lọc cặn bẩn kim loại trong dòng tuần hoàn nhớt.',
  },
  {
    id: 'airFilter',
    name: 'Lọc gió',
    category: 'engine',
    interval: 10000,
    icon: Wind,
    description: 'Lọc bụi bẩn không khí trước khi vào buồng đốt.',
  },
  {
    id: 'sparkPlug',
    name: 'Bugi đánh lửa',
    category: 'engine',
    interval: 10000,
    icon: Zap,
    description: 'Tạo tia lửa điện đốt cháy hòa khí trong buồng đốt.',
  },
  {
    id: 'coolant',
    name: 'Nước làm mát',
    category: 'engine',
    interval: 15000,
    icon: Thermometer,
    description: 'Ổn định nhiệt độ làm việc của buồng đốt động cơ làm mát bằng dung dịch.',
  },
  {
    id: 'fuelInjector',
    name: 'Kim phun & Họng xăng',
    category: 'engine',
    interval: 12000,
    icon: Fuel,
    description: 'Làm sạch cặn cacbon kim phun xăng điện tử và buồng đốt.',
  },

  // 2. Hệ thống truyền động (Drivetrain & Transmission)
  {
    id: 'chain',
    name: 'Nhông sên dĩa (NSD)',
    category: 'transmission',
    interval: 15000,
    icon: Settings,
    description: 'Truyền động lực từ động cơ tới bánh sau xe số và côn tay.',
  },
  {
    id: 'belt',
    name: 'Dây curoa',
    category: 'transmission',
    interval: 20000,
    icon: Repeat,
    description: 'Dây đai truyền động chính trên các dòng xe tay ga.',
  },
  {
    id: 'clutch',
    name: 'Bố ba càng & Chuông nồi',
    category: 'transmission',
    interval: 20000,
    icon: Disc,
    description: 'Bộ ly hợp truyền công suất động cơ vào hệ thống dẫn động.',
  },
  {
    id: 'gearOil',
    name: 'Nhớt hộp số (Nhớt láp)',
    category: 'transmission',
    interval: 6000,
    icon: Droplets,
    description: 'Bôi trơn bộ bánh răng truyền động cầu sau xe tay ga.',
  },
  {
    id: 'rollers',
    name: 'Bi nồi & Kẹp trượt',
    category: 'transmission',
    interval: 15000,
    icon: Sliders,
    description: 'Bi văng ly hợp biến thiên tỉ số truyền theo vòng tua máy xe tay ga.',
  },

  // 3. Phanh & Lốp xe (Brakes & Tires)
  {
    id: 'frontBrake',
    name: 'Bố thắng trước',
    category: 'brakes_tires',
    interval: 10000,
    icon: ShieldAlert,
    description: 'Má phanh đĩa hoặc bố thắng đùm hãm tốc độ bánh trước.',
  },
  {
    id: 'rearBrake',
    name: 'Bố thắng sau',
    category: 'brakes_tires',
    interval: 10000,
    icon: ShieldAlert,
    description: 'Má phanh đĩa hoặc bố đùm sau hãm tốc độ bánh sau.',
  },
  {
    id: 'brakeFluid',
    name: 'Dầu phanh (Dầu thắng)',
    category: 'brakes_tires',
    interval: 15000,
    icon: Droplet,
    description: 'Dung dịch truyền áp lực thủy lực từ tay thắng tới heo dầu.',
  },
  {
    id: 'brakeRotor',
    name: 'Đĩa phanh',
    category: 'brakes_tires',
    interval: 30000,
    icon: CircleDot,
    description: 'Đĩa ma sát bằng thép chịu lực gắn trên moay-ơ bánh xe.',
  },
  {
    id: 'frontTire',
    name: 'Lốp / Vỏ trước',
    category: 'brakes_tires',
    interval: 20000,
    icon: CircleDot,
    description: 'Lốp dẫn hướng tiếp xúc mặt đường và đảm bảo độ bám.',
  },
  {
    id: 'rearTire',
    name: 'Lốp / Vỏ sau',
    category: 'brakes_tires',
    interval: 15000,
    icon: CircleDot,
    description: 'Lốp chịu tải trọng chính và lực đẩy từ động cơ.',
  },

  // 4. Khung gầm & Giảm xóc (Chassis & Suspension)
  {
    id: 'frontFork',
    name: 'Dầu phuộc & Phốt trước',
    category: 'chassis_suspension',
    interval: 25000,
    icon: Activity,
    description: 'Dầu thủy lực giảm xóc và phốt cao su ngăn rò rỉ dầu phuộc trước.',
  },
  {
    id: 'rearShock',
    name: 'Phuộc nhún sau',
    category: 'chassis_suspension',
    interval: 30000,
    icon: Sliders,
    description: 'Kiểm tra ty giảm xóc sau, lò xo và cao su giảm chấn.',
  },
  {
    id: 'steeringBearing',
    name: 'Bạc đạn bánh & Chén cổ',
    category: 'chassis_suspension',
    interval: 25000,
    icon: Compass,
    description: 'Ổ bi bánh xe và vòng bi chén cổ tay lái.',
  },

  // 5. Hệ thống điện & Phụ trợ (Electrical & Controls)
  {
    id: 'battery',
    name: 'Bình ắc quy',
    category: 'electrical',
    interval: 25000,
    icon: BatteryCharging,
    description: 'Cung cấp nguồn điện khởi động động cơ và hệ thống ECU/FI.',
  },
  {
    id: 'headlight',
    name: 'Bóng đèn & Chiếu sáng',
    category: 'electrical',
    interval: 25000,
    icon: Lightbulb,
    description: 'Hệ thống đèn pha chính, xi-nhan và đèn hậu định vị.',
  },
  {
    id: 'cables',
    name: 'Dây ga & Dây côn',
    category: 'electrical',
    interval: 20000,
    icon: Cpu,
    description: 'Dây cáp cơ khí điều khiển bướm ga và bộ ngắt ly hợp.',
  },
];

