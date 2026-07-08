"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Heart, Star, Sparkles, Crown, Diamond, Gem, Flower2, Flower,
  Leaf, TreePine, Trees, Sun, Moon, Cloud, CloudRain, Snowflake,
  Droplets, Flame, Zap, Music, Music2, Music4, Mic, Headphones,
  Camera, Video, Film, Image, Palette, Brush, PenTool, Pencil,
  Eraser, Scissors, Clipboard, FileText, Notebook, BookOpen,
  BookMarked, Bookmark, Tag, Ticket, Gift, PartyPopper,
  Balloon, Cake, Wine, Coffee, Beer, ChefHat, UtensilsCrossed,
  Apple, Pizza, Cookie, IceCream, Candy, Banana, Cherry, Citrus,
  Car, Plane, Train, Ship, Bike, Bus, Truck, Rocket, Anchor,
  MapPin, Map, Globe, Compass, Navigation, Route, Timer, Clock,
  AlarmClock, Hourglass, Watch, Calendar, CalendarDays, CalendarHeart,
  Phone, Mail, MessageCircle, MessageSquare, Send, Inbox, Bell,
  AlertCircle, AlertTriangle, CheckCircle, XCircle, Info, Shield,
  ShieldCheck, Lock, Unlock, Key, Eye, EyeOff, Search, Filter,
  Settings, Sliders, Wrench, Hammer, Drill,
  Home, Building, Building2, Church, Tent, Castle, Hotel, Store,
  Warehouse, School, Hospital, Landmark,
  Users, User, UserCheck, UserPlus, UserMinus, UserStar,
  HeartHandshake, Hand, ThumbsUp, ThumbsDown, HandHeart,
  Smile, Laugh, Frown, Meh, Award, Trophy, Medal, Badge, Ribbon,
  Circle, Square, Triangle, Hexagon, Octagon, Pentagon,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp,
  ChevronsDown, Play, Pause, StopCircle as Stop, SkipForward, SkipBack,
  Rewind, FastForward, Volume1, Volume2, VolumeX, Mic2,
  Radio, Tv, Monitor, Laptop, Tablet, Smartphone, Printer,
  Keyboard, Mouse, HardDrive, Cpu, Battery, BatteryCharging,
  Wifi, WifiOff, Bluetooth, Usb, Disc, Save, Folder, FolderOpen,
  FolderPlus, File, FilePlus, FileCheck, FileX, FileText as FileTextIcon,
  ClipboardCheck, ClipboardX, ClipboardPlus, List, ListChecks,
  Check, X, Plus, Minus, Equal, Percent, DollarSign, Euro,
  PoundSterling, Wallet, CreditCard, Banknote, Coins, PiggyBank,
  TrendingUp, TrendingDown, BarChart3, PieChart, LineChart,
  Activity, Target, Flag, FlagTriangleRight, FlagTriangleLeft,
  FlagOff, MapPinPlus, MapPinCheck,
  Sparkle, Stars, MoonStar,
  Sunrise, Sunset, CloudSun, CloudMoon, Rainbow, Wind,
  Umbrella, UmbrellaOff, CloudLightning, CloudSnow, CloudDrizzle,
  Thermometer, ThermometerSun, ThermometerSnowflake,
  Bird, Cat, Dog, Fish, Rabbit, Turtle, Bug, Snail,
  Rose, Wheat, Sprout,
  Mountain, MountainSnow,
  Waves,
  HeartPulse, Stethoscope, Pill, Syringe, Bandage,
  Dumbbell,
  MapPinHouse, MountainIcon, TrophyIcon, MedalIcon, BikeIcon, CarIcon, BusIcon, CakeSlice,
} from "lucide-react";
import styles from "./IconPicker.module.css";

const ICON_MAP = {
  Heart, Star, Sparkles, Crown, Diamond, Gem, Flower2, Flower,
  Leaf, TreePine, Trees, Sun, Moon, Cloud, CloudRain, Snowflake,
  Droplets, Flame, Zap, Music, Music2, Music4, Mic, Headphones,
  Camera, Video, Film, Image, Palette, Brush, PenTool, Pencil,
  Eraser, Scissors, Clipboard, FileText, Notebook, BookOpen,
  BookMarked, Bookmark, Tag, Ticket, Gift, PartyPopper,
  Balloon, Cake, Wine, Coffee, Beer, ChefHat, UtensilsCrossed,
  Apple, Pizza, Cookie, IceCream, Candy, Banana, Cherry, Citrus,
  Car, Plane, Train, Ship, Bike, Bus, Truck, Rocket, Anchor,
  MapPin, Map, Globe, Compass, Navigation, Route, Timer, Clock,
  AlarmClock, Hourglass, Watch, Calendar, CalendarDays, CalendarHeart,
  Phone, Mail, MessageCircle, MessageSquare, Send, Inbox, Bell,
  AlertCircle, AlertTriangle, CheckCircle, XCircle, Info, Shield,
  ShieldCheck, Lock, Unlock, Key, Eye, EyeOff, Search, Filter,
  Settings, Sliders, Wrench, Hammer, Drill,
  Home, Building, Building2, Church, Tent, Castle, Hotel, Store,
  Warehouse, School, Hospital, Landmark,
  Users, User, UserCheck, UserPlus, UserMinus, UserStar,
  HeartHandshake, Hand, ThumbsUp, ThumbsDown, HandHeart,
  Smile, Laugh, Frown, Meh, Award, Trophy, Medal, Badge, Ribbon,
  Circle, Square, Triangle, Hexagon, Octagon, Pentagon,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp,
  ChevronsDown, Play, Pause, Stop, SkipForward, SkipBack,
  Rewind, FastForward, Volume1, Volume2, VolumeX, Mic2,
  Radio, Tv, Monitor, Laptop, Tablet, Smartphone, Printer,
  Keyboard, Mouse, HardDrive, Cpu, Battery, BatteryCharging,
  Wifi, WifiOff, Bluetooth, Usb, Disc, Save, Folder, FolderOpen,
  FolderPlus, File, FilePlus, FileCheck, FileX, FileTextIcon,
  ClipboardCheck, ClipboardX, ClipboardPlus, List, ListChecks,
  Check, X, Plus, Minus, Equal, Percent, DollarSign, Euro,
  PoundSterling, Wallet, CreditCard, Banknote, Coins, PiggyBank,
  TrendingUp, TrendingDown, BarChart3, PieChart, LineChart,
  Activity, Target, Flag, FlagTriangleRight, FlagTriangleLeft,
  FlagOff, MapPinHouse, MapPinPlus, MapPinCheck,
  Sparkle, Stars, MoonStar,
  Sunrise, Sunset, CloudSun, CloudMoon, Rainbow, Wind,
  Umbrella, UmbrellaOff, CloudLightning, CloudSnow, CloudDrizzle,
  Thermometer, ThermometerSun, ThermometerSnowflake,
  Bird, Cat, Dog, Fish, Rabbit, Turtle, Bug, Snail,
  Rose, Wheat, Sprout,
  Mountain, MountainSnow, MountainIcon,
  Waves,
  HeartPulse, Stethoscope, Pill, Syringe, Bandage,
  Dumbbell, TrophyIcon, MedalIcon,
  BikeIcon, CarIcon, BusIcon,
  CakeSlice,
};

const ICON_NAMES = Object.keys(ICON_MAP);

const CATEGORIES = [
  { name: "All", filter: () => true },
  { name: "Nature", filter: (n) => /Flower|Leaf|Tree|Sun|Moon|Cloud|Snow|Rain|Droplets|Flame|Wind|Rainbow|Mountain|Bird|Cat|Dog|Fish|Rose|Wheat|Sprout|Seedling|Waves|Sunrise|Sunset|CloudSun|CloudMoon|Cherry|Citrus|Apple|Banana|Pizza|Cookie|IceCream|Candy|Cake|Candle|Wine|Coffee|Beer|ChefHat|Utensils|HeartPulse|Pill|Stethoscope|Syringe|Bandage|Dumbbell/.test(n) },
  { name: "People", filter: (n) => /User|Users|Hand|Smile|Laugh|Frown|Meh|Clap|HeartHandshake/.test(n) },
  { name: "Objects", filter: (n) => /Heart|Star|Diamond|Gem|Crown|Gift|Ticket|Tag|Award|Trophy|Medal|Badge|Ribbon|Sparkle|Stars/.test(n) },
  { name: "Shapes", filter: (n) => /Circle|Square|Triangle|Hexagon|Octagon|Pentagon/.test(n) },
  { name: "Arrows", filter: (n) => /Arrow|Chevron|Play|Pause|Stop|Skip|Rewind|FastForward/.test(n) },
  { name: "Tech", filter: (n) => /Phone|Mail|Message|Send|Wifi|Bluetooth|Usb|Monitor|Laptop|Tablet|Smartphone|Printer|Keyboard|Mouse|Cpu|Battery|HardDrive|Camera|Video|Film|Radio|Tv/.test(n) },
  { name: "Business", filter: (n) => /Dollar|Euro|Pound|Wallet|CreditCard|Banknote|Coins|PiggyBank|Trending|Chart|BarChart|PieChart|LineChart|Activity|Target|Flag|Building|Store|Hotel|Warehouse|School|Hospital|Landmark|Mosque|Synagogue|Home|Tent|Castle|MapPin|Map|Globe|Compass|Navigation|Route|Car|Plane|Train|Ship|Bike|Bus|Truck|Rocket|Anchor/.test(n) },
  { name: "Files", filter: (n) => /File|Folder|Clipboard|List|Check|Save|Disc|Book|Notebook|PenTool|Pencil|Eraser|Scissors|Brush|Palette/.test(n) },
  { name: "Tools", filter: (n) => /Settings|Sliders|Tool|Wrench|Hammer|Screwdriver|Drill|Lock|Unlock|Key|Search|Filter|Bell|Alert|Shield|Info|Eye|Timer|Clock|Alarm|Hourglass|Watch|Calendar/.test(n) },
];

export default function IconPicker({ value, onChange, onClose }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filteredIcons = useMemo(() => {
    const category = CATEGORIES.find((c) => c.name === activeCategory);
    return ICON_NAMES.filter((name) => {
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category ? category.filter(name) : true;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const handleSelect = (name) => {
    onChange(name);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Choose Icon</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.searchBox}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={styles.searchIcon}>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 12L15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button type="button" className={styles.clearBtn} onClick={() => setSearch("")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className={styles.categories}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={`${styles.categoryBtn} ${activeCategory === cat.name ? styles.active : ""}`}
              onClick={() => setActiveCategory(cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className={styles.iconCount}>
          {filteredIcons.length} icon{filteredIcons.length !== 1 ? "s" : ""}
        </div>

        <div className={styles.grid}>
          {filteredIcons.map((name) => {
            const IconComponent = ICON_MAP[name];
            if (!IconComponent) return null;
            return (
              <button
                key={name}
                type="button"
                className={`${styles.iconBtn} ${value === name ? styles.selected : ""}`}
                onClick={() => handleSelect(name)}
                title={name}
              >
                <IconComponent size={24} strokeWidth={1.5} />
                <span className={styles.iconName}>{name}</span>
              </button>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="20" cy="20" r="12" stroke="#c28e5c" strokeWidth="2"/>
              <path d="M28 28L38 38" stroke="#c28e5c" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className={styles.emptyText}>No icons found</p>
            <p className={styles.emptySubtext}>Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function renderIconByName(name, props = {}) {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}
