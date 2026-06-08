import { LayoutDashboard, History, LineChart, LayoutGrid, Clock, Settings } from 'lucide-react';

export const ROUTES = [
    {
        path: '/',
        icon: LayoutGrid,
        labelKey: 'nav.overview',
        shortcut: '1',
        rolesAllowed: ['operator', 'manager']
    },
    {
        path: '/dashboard/1',
        icon: LayoutDashboard,
        labelKey: 'nav.detail_view',
        shortcut: '2',
        rolesAllowed: ['operator', 'manager']
    },
    {
        isDivider: true,
        rolesAllowed: ['manager']
    },
    {
        path: '/history',
        icon: History,
        labelKey: 'nav.history',
        shortcut: '3',
        rolesAllowed: ['manager']
    },
    {
        path: '/analytics',
        icon: LineChart,
        labelKey: 'nav.analytics',
        shortcut: '4',
        rolesAllowed: ['manager']
    },
    {
        path: '/downtime-history',
        icon: Clock,
        labelKey: 'Downtime History', // Can be replaced with i18n key later
        shortcut: 'H',
        rolesAllowed: ['manager']
    },
    {
        path: '/settings',
        icon: Settings,
        labelKey: 'Settings', // Can be replaced with i18n key later
        shortcut: '5',
        rolesAllowed: ['manager']
    }
];
