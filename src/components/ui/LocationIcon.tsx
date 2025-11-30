'use client'

import { motion } from 'framer-motion'
import { 
  Bus, Mountain, Factory, Landmark, Waves, 
  Trees, Wheat, Building2, Train, Ship,
  Gem, Coffee, Droplets, Zap, MapPin,
  Building, Home, ShoppingBag, Plane, Car,
  Anchor, Warehouse, Store
} from 'lucide-react'
import { useMemo } from 'react'

interface LocationIconProps {
  locationId: string
  locationName: string
  locationType?: string
  stateId?: string
  size?: number
  className?: string
  variant?: 'default' | 'large' | 'small'
}

// Major Cities Mapping - Iconic symbols
const cityIcons: Record<string, any> = {
  // Lagos & surrounding
  'lagos': Bus, // Yellow Danfo Bus - iconic Lagos symbol
  'ikeja': Bus,
  'surulere': Bus,
  'yaba': Bus,
  'lekki': Waves, // Peninsula/coastal
  'victoria-island': Building2, // Business district
  'ikoyi': Building, // Upscale residential
  'ajah': Waves,
  'maryland': Building,
  
  // Abuja & FCT
  'abuja': Mountain, // Zuma Rock
  'fct': Mountain,
  'wuse': ShoppingBag, // Commercial district
  'garki': Building, // Government area
  'maitama': Building, // Diplomatic area
  'asokoro': Building,
  'gwarinpa': Home,
  'kubwa': Home,
  'nyanya': Home,
  
  // Kano
  'kano': Wheat, // Groundnut Pyramids
  'fagge': Wheat,
  'nassarawa': Wheat,
  
  // Port Harcourt & Oil cities
  'port-harcourt': Factory, // Oil industry
  'warri': Factory,
  'eleme': Factory,
  'rumuokoro': Factory,
  
  // Enugu - Coal City
  'enugu': Gem, // Coal mining
  'new-haven': Gem,
  'ogui': Gem,
  
  // Benin City - Bronze heritage
  'benin-city': Landmark, // Benin Bronzes
  'benin': Landmark,
  'ogba': Landmark,
  
  // Calabar - Coastal/Carnival
  'calabar': Waves, // Coastal city, Carnival
  'marina': Waves,
  
  // Ibadan - Cocoa House
  'ibadan': Building2, // Cocoa House landmark
  'bodija': ShoppingBag, // Market area
  'agodi': Building2,
  'dugbe': ShoppingBag,
  
  // Abeokuta - Olumo Rock
  'abeokuta': Mountain, // Olumo Rock
  'ogun': Mountain,
  
  // Jos - Plateau/Shere Hills
  'jos': Mountain, // Shere Hills
  'bukuru': Mountain,
  
  // Kaduna - Railway hub
  'kaduna': Train, // Railway station
  'kawo': Train,
  'rigasa': Train,
  
  // Onitsha - River port
  'onitsha': Ship, // River port
  'nkwelle': Ship,
  
  // Aba - Commercial hub
  'aba': ShoppingBag, // Ariaria market
  'ngwa-road': ShoppingBag,
  
  // Owerri - Cultural
  'owerri': Home, // Mbari cultural center
  'world-bank': Home,
  
  // Uyo - Oil state capital
  'uyo': Droplets, // Oil state
  'etim-ekpo': Droplets,
  
  // Makurdi - Agricultural
  'makurdi': Trees, // Agricultural hub
  'wurukum': Trees,
  
  // Minna - Capital
  'minna': Building, // State capital
  'chanchaga': Building,
  
  // Lokoja - Confluence
  'lokoja': Waves, // River confluence
  'adankolo': Waves,
  
  // Other major cities
  'akure': Coffee, // Cocoa region
  'ado-ekiti': Coffee,
  'osogbo': Coffee,
  'ilorin': Wheat,
  'asaba': Building,
  'yenagoa': Factory,
  'umuahia': Building,
  'awka': Building,
  'abakaliki': Gem,
  'lafia': Building,
  'jalingo': Trees,
  'gusau': Gem,
  'sokoto': Wheat,
  'birnin-kebbi': Wheat,
  'dutse': Wheat,
  'bauchi': Mountain,
  'gombe': Trees,
  'damaturu': Trees,
  'maiduguri': Trees,
  'yola': Mountain,
  
  // Additional popular areas
  'magodo': Home,
  'omole': Home,
  'ogba': Home,
  'alausa': Building,
  'computer-village': ShoppingBag,
  'balogun': ShoppingBag,
  'tejuosho': ShoppingBag,
  'ojota': Bus,
  'ketu': Bus,
  'mile-12': ShoppingBag,
  'mushin': Home,
  'oshodi': Bus,
  'isolo': Home,
  'agege': Home,
  'ilupeju': Factory,
  'ikeja-airport': Plane,
  'mmia': Plane,
  'apapa': Ship,
  'tin-can': Ship,
  'festac': Home,
  'ajegunle': Home,
  'unilag': Building2,
  'university-of-lagos': Building2,
  'lasu': Building2,
  'unilag-main-campus': Building2,
  'wuse-2': ShoppingBag,
  'wuse-market': ShoppingBag,
  'garki-2': Building,
  'jabi': ShoppingBag,
  'life-camp': Home,
  'lugbe': Home,
  'karu': Home,
  'kubwa': Home,
  'nyanya': Home,
  'gwarinpa': Home,
  'asokoro': Building,
  'maitama': Building,
  'garki': Building,
  'wuse': ShoppingBag,
  'bodija': ShoppingBag,
  'agodi': Building2,
  'dugbe': ShoppingBag,
  'sabon-gari': ShoppingBag,
  'ariaria': ShoppingBag,
  'onitsha-market': ShoppingBag,
  'ngwa-road': ShoppingBag,
  'world-bank': Home,
  'wurukum': Trees,
  'chanchaga': Building,
  'adankolo': Waves,
  'etim-ekpo': Droplets,
  'nkwelle': Ship,
  'kawo': Train,
  'rigasa': Train,
  'bukuru': Mountain,
  'ogba': Landmark,
  'marina': Waves,
  'fagge': Wheat,
  'nassarawa': Wheat,
  'new-haven': Gem,
  'ogui': Gem,
}

// States Mapping - by economic/cultural identity
const stateIcons: Record<string, any> = {
  // South West - Commercial/Agricultural
  'lagos': Bus,
  'ogun': Building2,
  'oyo': Building2,
  'osun': Coffee,
  'ekiti': Coffee,
  'ondo': Coffee,
  
  // North Central - Agricultural/Mining
  'kwara': Wheat,
  'kogi': Waves,
  'benue': Trees,
  'niger': Building,
  'plateau': Mountain,
  'nasarawa': Mountain,
  'fct': Mountain,
  
  // South South - Oil/Gas
  'edo': Landmark,
  'delta': Factory,
  'rivers': Factory,
  'bayelsa': Factory,
  'akwa-ibom': Factory,
  'cross-river': Waves,
  
  // South East - Commercial/Industrial
  'abia': ShoppingBag,
  'imo': Home,
  'anambra': Building,
  'ebonyi': Gem,
  'enugu': Gem,
  
  // North West - Agricultural/Mining
  'kaduna': Train,
  'kano': Wheat,
  'katsina': Wheat,
  'zamfara': Gem,
  'sokoto': Wheat,
  'kebbi': Wheat,
  'jigawa': Wheat,
  
  // North East - Agricultural/Mining
  'yobe': Trees,
  'borno': Trees,
  'adamawa': Mountain,
  'gombe': Trees,
  'bauchi': Mountain,
  'taraba': Trees,
}

// Type-based fallbacks
const typeIcons: Record<string, any> = {
  'airport': Plane,
  'market': ShoppingBag,
  'tourist': Landmark,
  'industrial': Factory,
  'institution': Building,
  'city': Building2,
  'area': MapPin,
  'lga': MapPin,
  'state': Building,
}

// Special area mappings (neighborhoods, districts)
const areaIcons: Record<string, any> = {
  // Lagos areas
  'unilag': Building2, // University
  'university-of-lagos': Building2,
  'apapa': Ship, // Port
  'tin-can': Ship,
  'festac': Home,
  'ajegunle': Home,
  'oshodi': Bus,
  'mushin': Home,
  'isolo': Home,
  'agege': Home,
  'ilupeju': Factory,
  'ikeja-airport': Plane,
  
  // Abuja areas
  'airport-road': Plane,
  'jabi': ShoppingBag,
  'life-camp': Home,
  'lugbe': Home,
  'karu': Home,
  
  // Other notable areas
  'sabon-gari': ShoppingBag, // Commercial areas
  'wuse-market': ShoppingBag,
  'ariaria': ShoppingBag,
  'onitsha-market': ShoppingBag,
}

export function LocationIcon({ 
  locationId, 
  locationName, 
  locationType,
  stateId,
  size = 32,
  className = '',
  variant = 'default'
}: LocationIconProps) {
  // Normalize IDs for matching
  const normalizedId = locationId.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
  const normalizedStateId = stateId?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
  const normalizedName = locationName.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
  
  // Determine icon with priority: City > Area > State > Type > Default
  const IconComponent = useMemo(() => {
    // Check city icons first
    if (cityIcons[normalizedId] || cityIcons[normalizedName]) {
      return cityIcons[normalizedId] || cityIcons[normalizedName]
    }
    
    // Check area icons
    if (areaIcons[normalizedId] || areaIcons[normalizedName]) {
      return areaIcons[normalizedId] || areaIcons[normalizedName]
    }
    
    // Check state icons
    if (stateIcons[normalizedId] || stateIcons[normalizedName]) {
      return stateIcons[normalizedId] || stateIcons[normalizedName]
    }
    
    // Check parent state
    if (normalizedStateId && stateIcons[normalizedStateId]) {
      return stateIcons[normalizedStateId]
    }
    
    // Check type-based icons
    if (locationType && typeIcons[locationType]) {
      return typeIcons[locationType]
    }
    
    // Default fallback
    return MapPin
  }, [normalizedId, normalizedName, normalizedStateId, locationType])
  
  // Size variants
  const iconSize = variant === 'large' ? size * 1.5 : variant === 'small' ? size * 0.75 : size
  
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 260,
        damping: 20,
        delay: 0.15
      }}
      whileHover={{ 
        scale: 1.15,
        rotate: [0, -8, 8, -8, 0],
        transition: { 
          duration: 0.6,
          ease: "easeInOut"
        }
      }}
      className={`flex items-center justify-center relative ${className}`}
    >
      {/* Subtle glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-white/10 blur-md"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <IconComponent 
        size={iconSize} 
        className="text-white drop-shadow-2xl relative z-10"
        strokeWidth={variant === 'large' ? 2.5 : variant === 'small' ? 1.5 : 2}
      />
    </motion.div>
  )
}

