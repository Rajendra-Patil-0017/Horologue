const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'src', 'components', 'Collection.tsx');
let collectionCode = fs.readFileSync(collectionPath, 'utf8');

const newWatchesArray = `export interface Watch {
  name: string;
  ref: string;
  price: string;
  image: string;
  gallery: string[];
}

export const watches: Watch[] = [
  {
    name: 'THE CHRONOS',
    ref: 'REF. 401.CX.0123',
    price: '$125,000',
    image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/chronos_gallery_1_1781355514781.png', '/images/chronos_gallery_2_1781355529778.png']
  },
  {
    name: 'THE AVIATOR',
    ref: 'REF. 502.TX.0456',
    price: '$85,000',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/aviator_gallery_1_1781355543072.png', '/images/aviator_gallery_2_1781355556312.png']
  },
  {
    name: 'THE NOCTURNE',
    ref: 'REF. 603.OX.0789',
    price: '$180,000',
    image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/nocturne_gallery_1_1781355569738.png', '/images/nocturne_gallery_2_1781355583536.png']
  },
  {
    name: 'THE ECLIPSE',
    ref: 'REF. 704.UX.1011',
    price: '$210,000',
    image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=801&auto=format&fit=crop',
    gallery: ['/images/eclipse_gallery_1_1781355595360.png', '/images/eclipse_gallery_2_1781355606672.png']
  },
  {
    name: 'THE VANGUARD',
    ref: 'REF. 805.MX.1213',
    price: '$95,000',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/vanguard_gallery_1_1781355617620.png', '/images/vanguard_gallery_2_1781355628159.png']
  },
  {
    name: 'THE MERIDIAN',
    ref: 'REF. 906.SX.1415',
    price: '$145,000',
    image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=801&auto=format&fit=crop',
    gallery: ['/images/meridian_gallery_1_1781355648747.png', '/images/meridian_gallery_2_1781355659372.png']
  },
  {
    name: 'THE HORIZON',
    ref: 'REF. 107.RX.1617',
    price: '$65,000',
    image: 'https://images.unsplash.com/photo-1604242692760-2f7b0c26856d?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/horizon_gallery_1_1781355672075.png', '/images/horizon_gallery_2_1781355683974.png']
  },
  {
    name: 'THE APEX',
    ref: 'REF. 208.WX.1819',
    price: '$255,000',
    image: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/apex_gallery_1_1781355697746.png', '/images/apex_gallery_2_1781355709752.png']
  },
  {
    name: 'THE ZENITH',
    ref: 'REF. 309.LX.2021',
    price: '$115,000',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/zenith_gallery_1_1781355722418.png', 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=805&auto=format&fit=crop']
  },
  {
    name: 'THE PULSAR',
    ref: 'REF. 410.PX.2223',
    price: '$135,000',
    image: 'https://images.unsplash.com/photo-1539874754764-5a96559165b0?q=80&w=800&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1526045612288-29be192b1928?q=80&w=805&auto=format&fit=crop', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=805&auto=format&fit=crop']
  },
  {
    name: 'THE QUASAR',
    ref: 'REF. 511.QX.2425',
    price: '$290,000',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=801&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1622434641406-a15622879ed5?q=80&w=805&auto=format&fit=crop', 'https://images.unsplash.com/photo-1604242692760-2f7b0c26856d?q=80&w=805&auto=format&fit=crop']
  },
  {
    name: 'THE STELLAR',
    ref: 'REF. 612.VX.2627',
    price: '$88,000',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=801&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=805&auto=format&fit=crop', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=805&auto=format&fit=crop']
  },
  {
    name: 'THE NEBULA',
    ref: 'REF. 713.NX.2829',
    price: '$320,000',
    image: 'https://images.unsplash.com/photo-1604242692760-2f7b0c26856d?q=80&w=801&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=805&auto=format&fit=crop', 'https://images.unsplash.com/photo-1539874754764-5a96559165b0?q=80&w=805&auto=format&fit=crop']
  },
  {
    name: 'THE EQUINOX',
    ref: 'REF. 814.EX.3031',
    price: '$175,000',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=800&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1594536647141-8f5b84c6e93c?q=80&w=805&auto=format&fit=crop', 'https://images.unsplash.com/photo-1612817288484-1c611dfdca11?q=80&w=805&auto=format&fit=crop']
  },
  {
    name: 'THE SOLSTICE',
    ref: 'REF. 915.ZX.3233',
    price: '$105,000',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=805&auto=format&fit=crop', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=805&auto=format&fit=crop']
  }
];`;

const startRegex = /export interface Watch \{[\s\S]*?export const watches: Watch\[\] = \[[\s\S]*?\];/;
collectionCode = collectionCode.replace(startRegex, newWatchesArray);
fs.writeFileSync(collectionPath, collectionCode);

const productDetailsPath = path.join(__dirname, 'src', 'components', 'ProductDetails.tsx');
let productDetailsCode = fs.readFileSync(productDetailsPath, 'utf8');

const pdStart = `// Mocking extra images for the gallery
  const gallery = [
    watch.image,
    'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=802&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=802&auto=format&fit=crop'
  ];`;
const pdEnd = `// Use the uniquely generated/assigned gallery images
  const gallery = [watch.image, ...(watch.gallery || [])];`;

productDetailsCode = productDetailsCode.replace(pdStart, pdEnd);
fs.writeFileSync(productDetailsPath, productDetailsCode);

console.log("Updated files!");
