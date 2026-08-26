// FTN Index — category-aware public business metadata schemas.
// Extends the shared Entity Metadata Engine; it does not create a parallel schema system.
(function(global){
'use strict';
var engine=global.FTN&&global.FTN.EntityMetadataEngine;
if(!engine)return;
var common=[
  {key:'name',label:'Business name',type:'text',required:true},
  {key:'description',label:'What you do',type:'textarea',required:false},
  {key:'phone',label:'Public phone',type:'text',required:false},
  {key:'email',label:'Public email',type:'email',required:false},
  {key:'website',label:'Website',type:'text',required:false},
  {key:'address',label:'Address',type:'text',required:false},
  {key:'locality',label:'Town / locality',type:'text',required:false},
  {key:'hours',label:'Opening hours',type:'textarea',required:false},
  {key:'instagram',label:'Instagram',type:'text',required:false},
  {key:'facebook',label:'Facebook',type:'text',required:false},
  {key:'whatsapp',label:'WhatsApp',type:'text',required:false},
  {key:'services',label:'Services',type:'textarea',required:false}
];
function add(type,extra){engine.registerSchema(type,{fields:common.concat(extra||[])});}
add('ftn-index-business',[
  {key:'serviceArea',label:'Service area',type:'text',required:false},
  {key:'bookingUrl',label:'Booking / enquiry link',type:'text',required:false},
  {key:'products',label:'Products',type:'textarea',required:false}
]);
add('ftn-index-accommodation',[
  {key:'accommodationType',label:'Accommodation type',type:'text',required:false},
  {key:'bookingUrl',label:'Booking link',type:'text',required:false},
  {key:'checkIn',label:'Check-in',type:'text',required:false},
  {key:'checkOut',label:'Check-out',type:'text',required:false},
  {key:'amenities',label:'Amenities',type:'textarea',required:false},
  {key:'accessibility',label:'Accessibility',type:'textarea',required:false},
  {key:'airportTransfer',label:'Airport transfer',type:'text',required:false},
  {key:'foodService',label:'Food service',type:'text',required:false},
  {key:'nearbyAttractions',label:'Nearby attractions',type:'textarea',required:false}
]);
add('ftn-index-restaurant',[
  {key:'cuisine',label:'Cuisine',type:'text',required:false},
  {key:'menuUrl',label:'Menu link',type:'text',required:false},
  {key:'reservationsUrl',label:'Reservations link',type:'text',required:false},
  {key:'diningOptions',label:'Dining options',type:'textarea',required:false},
  {key:'delivery',label:'Delivery',type:'text',required:false},
  {key:'takeaway',label:'Takeaway',type:'text',required:false},
  {key:'dietaryOptions',label:'Dietary options',type:'textarea',required:false},
  {key:'priceRange',label:'Price range',type:'text',required:false}
]);
add('ftn-index-tours',[
  {key:'tourTypes',label:'Tour types',type:'textarea',required:false},
  {key:'bookingUrl',label:'Booking link',type:'text',required:false},
  {key:'pickupArea',label:'Pickup area',type:'text',required:false},
  {key:'languages',label:'Languages',type:'text',required:false},
  {key:'accessibility',label:'Accessibility',type:'textarea',required:false},
  {key:'duration',label:'Typical duration',type:'text',required:false},
  {key:'priceRange',label:'Price range',type:'text',required:false}
]);
})(window);
