import { Skeleton } from '../ui/skeleton';
import { TableCell, TableRow } from '../ui/table';

export function StakersListRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-24 bg-gray-200" />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <Skeleton className="h-5 w-20 bg-gray-200" />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <Skeleton className="h-5 w-28 bg-gray-200" />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <Skeleton className="h-5 w-16 bg-gray-200" />
        </div>
      </TableCell>
    </TableRow>
  );
}
