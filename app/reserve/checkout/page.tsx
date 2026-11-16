import ClubCheckout from './club-checkout';
export const metadata={title:'Secure Reservation Checkout | 202 Lounge',robots:{index:false,follow:false}};
export default function CheckoutPage(){return <ClubCheckout publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY||''}/>;}
