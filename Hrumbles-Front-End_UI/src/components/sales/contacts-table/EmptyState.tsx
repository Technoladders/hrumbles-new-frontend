import { motion } from 'framer-motion';
import { Users, Filter, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'no-contacts' | 'no-results' | 'error';
  onReset?: () => void;
  onAddContact?: () => void;
}

export function EmptyState({ type, onReset, onAddContact }: EmptyStateProps) {
  const config = {
    'no-contacts': {
      icon: Inbox,
      title: 'No contacts yet',
      description: 'Get started by adding your first contact or importing a file.',
      action: onAddContact ? { label: 'Add Contact', onClick: onAddContact } : undefined
    },
    'no-results': {
      icon: Filter,
      title: 'No matching contacts',
      description: 'Try adjusting your filters or search terms.',
      action: onReset ? { label: 'Clear Filters', onClick: onReset } : undefined
    },
    'error': {
      icon: Users,
      title: 'Something went wrong',
      description: 'We couldn\'t load your contacts. Please try again.',
      action: { label: 'Retry', onClick: () => window.location.reload() }
    }
  };

  const { icon: Icon, title, description, action } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-6 p-6 rounded-full bg-purple-50"
      >
        <Icon className="h-12 w-12 text-purple-500" />
      </motion.div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{description}</p>

      {action && (
        <Button
          onClick={action.onClick}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
