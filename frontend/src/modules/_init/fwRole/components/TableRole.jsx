import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

const TableRole = () => {
    const data = [
        {
            role: 'admin',
            permissions: 'ad,as,as,sasa,asgas',
            active: 1,
            default: 0,
        },
        {
            role: 'sub-admin',
            permissions: 'ad,as,as,sasa,asgasasssa',
            active: 1,
            default: 0,
        },
        {
            role: 'user',
            permissions: 'ad,as,as,sasa,asgas',
            active: 0,
            default: 1,
        }
    ];
    return <Table>
        <TableHeader>
            <TableRow className='font-semibold'>
                <TableHead>#</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Default</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.map((item, index) => {
                return <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.permissions}</TableCell>
                    <TableCell>{item.role}</TableCell>
                    <TableCell>
                        <Switch
                            checked={!!item.active}
                        />

                    </TableCell>
                    <TableCell>{item.default}</TableCell>

                </TableRow>;
            })}
        </TableBody>
    </Table>;
};

export default TableRole;