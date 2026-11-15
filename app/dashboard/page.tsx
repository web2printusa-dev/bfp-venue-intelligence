import {redirect} from 'next/navigation';
export const metadata={title:'Admin | 202 Lounge',robots:{index:false,follow:false}};
export default function Dashboard(){redirect('/admin');}
