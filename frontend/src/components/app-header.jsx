import { SidebarTrigger } from '@/components/ui/sidebar';
import { BellIcon } from 'lucide-react';
export function AppHeader() {
    return <div className='h-fit flex justify-between items-center p-2 bg-sidebar text-sidebar-foreground'>
        <SidebarTrigger />
        <div className='flex items-center pr-8'>
            <BellIcon />
        </div>
    </div>;
}
