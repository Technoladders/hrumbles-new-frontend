// src/components/EffectivePagination.tsx
import React from 'react';
import { usePagination, DOTS } from '@/hooks/use-pagination'; // Adjust path if needed
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"; // Assuming shadcn pagination components
import { Button } from "@/components/ui/button"; // Use Button for Prev/Next consistency

interface EffectivePaginationProps {
  onPageChange: (page: number) => void;
  totalCount: number;       // Total number of items
  siblingCount?: number;    // Optional: defaults to 1 in hook
  currentPage: number;      // Current page (1-based)
  pageSize: number;         // Items per page
  className?: string;       // Optional additional class names
}

const EffectivePagination: React.FC<EffectivePaginationProps> = (props) => {
  const {
    onPageChange,
    totalCount,
    siblingCount = 1,
    currentPage,
    pageSize,
    className,
  } = props;

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
  });

  const totalPageCount = Math.ceil(totalCount / pageSize);

  // If there are less than 2 pages, don't render pagination
  if (currentPage === 0 || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    if (currentPage < totalPageCount) {
        onPageChange(currentPage + 1);
    }
  };

  const onPrevious = () => {
     if (currentPage > 1) {
        onPageChange(currentPage - 1);
     }
  };

  // Determine the last page number shown in the range (might not be totalPageCount if ellipsis is used)
  const lastPageInRange = paginationRange[paginationRange.length - 1];

  return (
    <Pagination className={className}>
      <PaginationContent>
        {/* Previous Button */}
        <PaginationItem>
           <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 p-0"
              disabled={currentPage === 1}
              onClick={onPrevious}
              aria-label="Go to previous page"
           >
             <PaginationPrevious className="h-4 w-4" />
           </Button>
        </PaginationItem>

        {/* Page Numbers & Dots */}
        {paginationRange.map((pageNumber, index) => {
          // If the pageItem is a DOT, render the PaginationEllipsis component
          if (pageNumber === DOTS) {
            return (
              <PaginationItem key={DOTS + index}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          // Render our Page Pills
          return (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                 href="#" // Prevent page reload, handle with onClick
                 onClick={(e) => {
                     e.preventDefault(); // Prevent default anchor behavior
                     if (typeof pageNumber === 'number') { // Type guard
                         onPageChange(pageNumber);
                     }
                 }}
                 isActive={pageNumber === currentPage}
                 aria-current={pageNumber === currentPage ? 'page' : undefined}
                 className="h-9 w-9 p-0" // Ensure consistent size
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        {/* Next Button */}
        <PaginationItem>
           <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 p-0"
              // Disable if current page is the last page *number* in the visible range OR the actual last page
              disabled={currentPage === lastPageInRange || currentPage === totalPageCount}
              onClick={onNext}
              aria-label="Go to next page"
           >
               <PaginationNext className="h-4 w-4" />
           </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default EffectivePagination;