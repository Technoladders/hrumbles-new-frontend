// src/components/notifications/InterviewReminderOverlay.tsx
// Mount in App.jsx OUTSIDE <Router> alongside <UploadProgressFloat />
// Uses Chakra UI only — matches MainLayout.jsx style exactly.
// No framer-motion dependency — uses Chakra's built-in transitions.

import React, { useState } from 'react';
import {
  Box, VStack, HStack, Text, IconButton, Button,
  Menu, MenuButton, MenuList, MenuItem, Badge,
  Portal, useColorModeValue, Collapse,
} from '@chakra-ui/react';
import {
  FiX, FiClock, FiMapPin, FiVideo, FiPhone, FiUser,
  FiChevronDown, FiExternalLink, FiCalendar, FiBell,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useInterviewReminders, InterviewReminder } from '@/hooks/useInterviewReminders';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  try {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return t; }
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function TypeIcon({ type }: { type: string | null }) {
  if (!type) return <FiVideo size={11} />;
  const t = type.toLowerCase();
  if (t.includes('phone') || t.includes('call')) return <FiPhone size={11} />;
  if (t.includes('person') || t.includes('office') || t.includes('onsite')) return <FiUser size={11} />;
  return <FiVideo size={11} />;
}

// ── Single card ───────────────────────────────────────────────────────────────

function ReminderCard({
  reminder,
  snoozeOptions,
  onDismiss,
  onSnooze,
  onView,
}: {
  reminder:      InterviewReminder;
  snoozeOptions: number[];
  onDismiss:     (id: string) => void;
  onSnooze:      (id: string, mins: number) => void;
  onView:        (r: InterviewReminder) => void;
}) {
  const { meta } = reminder;

  const cardBg      = useColorModeValue('white', 'gray.800');
  const bodyColor   = useColorModeValue('gray.700', 'gray.200');
  const mutedColor  = useColorModeValue('gray.500', 'gray.400');
  const pillBg      = useColorModeValue('purple.50', 'purple.900');
  const pillColor   = useColorModeValue('purple.700', 'purple.200');
  const borderColor = useColorModeValue('purple.200', 'purple.600');

  return (
    <Box
      w="320px"
      bg={cardBg}
      borderRadius="14px"
      boxShadow="0 8px 32px rgba(124,58,237,0.16), 0 2px 8px rgba(0,0,0,0.08)"
      border="1.5px solid"
      borderColor={borderColor}
      overflow="hidden"
      // Slide-in via CSS animation
      sx={{
        animation: 'slideInRight 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        '@keyframes slideInRight': {
          from: { opacity: 0, transform: 'translateX(60px) scale(0.95)' },
          to:   { opacity: 1, transform: 'translateX(0) scale(1)' },
        },
      }}
    >
      {/* Top purple accent */}
      <Box h="3px" bgGradient="linear(to-r, purple.500, purple.400)" />

      <Box px={3} pt={2.5} pb={3}>
        {/* Row 1: badges + dismiss */}
        <HStack justify="space-between" align="center" mb={2}>
          <HStack spacing={1.5}>
            {/* Pulsing dot */}
            <Box
              w="7px" h="7px" borderRadius="full" bg="purple.500" flexShrink={0}
              sx={{
                animation: 'pulseRing 2s ease infinite',
                '@keyframes pulseRing': {
                  '0%':   { boxShadow: '0 0 0 0 rgba(124,58,237,0.5)' },
                  '70%':  { boxShadow: '0 0 0 7px rgba(124,58,237,0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0)' },
                },
              }}
            />
            <Badge
              bg="purple.500" color="white"
              px={2} py={0.5} borderRadius="full"
              fontSize="9px" fontWeight="700" letterSpacing="0.5px"
            >
              ⏰ {meta.reminder_minutes} MIN
            </Badge>
            {meta.round && (
              <Badge
                variant="outline" colorScheme="purple"
                fontSize="9px" borderRadius="full" px={1.5}
              >
                {meta.round}
              </Badge>
            )}
          </HStack>

          <IconButton
            aria-label="Dismiss"
            icon={<FiX size={13} />}
            size="xs" variant="ghost"
            color={mutedColor}
            borderRadius="full"
            _hover={{ bg: 'red.50', color: 'red.400' }}
            onClick={() => onDismiss(reminder.id)}
          />
        </HStack>

        {/* Row 2: candidate + job */}
        <VStack align="start" spacing={0} mb={2.5}>
          <Text fontSize="14px" fontWeight="700" color={bodyColor} lineHeight="1.2" noOfLines={1}>
            {meta.candidate_name}
          </Text>
          <Text fontSize="11px" color="purple.600" fontWeight="600" noOfLines={1}>
            {meta.job_title}
          </Text>
        </VStack>

        {/* Row 3: time/date/type pills */}
        <HStack spacing={1.5} flexWrap="wrap" mb={2}>
          <HStack
            spacing={1} bg={pillBg} px={2} py={1}
            borderRadius="7px" fontSize="10px" color={pillColor} fontWeight="600"
          >
            <FiClock size={9} />
            <Text>{formatTime(meta.interview_time)}</Text>
          </HStack>
          <HStack
            spacing={1} bg={pillBg} px={2} py={1}
            borderRadius="7px" fontSize="10px" color={pillColor} fontWeight="600"
          >
            <FiCalendar size={9} />
            <Text>{formatDate(meta.interview_date)}</Text>
          </HStack>
          {meta.interview_type && (
            <HStack
              spacing={1} bg={pillBg} px={2} py={1}
              borderRadius="7px" fontSize="10px" color={pillColor} fontWeight="600"
            >
              <TypeIcon type={meta.interview_type} />
              <Text>{meta.interview_type}</Text>
            </HStack>
          )}
        </HStack>

        {/* Location */}
        {meta.interview_location && (
          <HStack spacing={1} mb={2} color={mutedColor} fontSize="10px">
            <FiMapPin size={9} />
            <Text noOfLines={1}>{meta.interview_location}</Text>
          </HStack>
        )}

        {/* Row 4: Snooze + Action */}
        <HStack spacing={2}>
          {/* Snooze menu */}
          <Menu placement="top" size="sm" isLazy>
            <MenuButton
              as={Button}
              size="xs"
              variant="outline"
              colorScheme="purple"
              borderRadius="7px"
              fontSize="10px"
              fontWeight="600"
              rightIcon={<FiChevronDown size={9} />}
              flex={1}
            >
              Snooze
            </MenuButton>
            <MenuList minW="110px" fontSize="11px" zIndex={99999}>
              {snoozeOptions.map(mins => (
                <MenuItem
                  key={mins}
                  onClick={() => onSnooze(reminder.id, mins)}
                  _hover={{ bg: 'purple.50', color: 'purple.700' }}
                  fontWeight="500"
                >
                  {mins} minutes
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Join or View */}
          {meta.joining_link ? (
            <Button
              as="a"
              href={meta.joining_link}
              target="_blank"
              size="xs"
              colorScheme="purple"
              borderRadius="7px"
              fontSize="10px"
              fontWeight="700"
              flex={1}
              rightIcon={<FiExternalLink size={9} />}
            >
              Join
            </Button>
          ) : (
            <Button
              size="xs"
              colorScheme="purple"
              borderRadius="7px"
              fontSize="10px"
              fontWeight="700"
              flex={1}
              rightIcon={<FiExternalLink size={9} />}
              onClick={() => onView(reminder)}
            >
              View
            </Button>
          )}
        </HStack>
      </Box>
    </Box>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────

export function InterviewReminderOverlay() {
  const navigate = useNavigate();
  const { reminders, dismiss, snooze, dismissAll } = useInterviewReminders();

  // Read snooze options from config if available, else defaults
  const snoozeOptions = [5, 10, 15];

  const visible  = reminders.slice(0, 3);
  const overflow = reminders.length - 3;

  const handleView = (r: InterviewReminder) => {
    const { candidate_id, job_id } = r.meta;
    if (candidate_id && job_id) {
      navigate(`/jobs/candidateprofile/${candidate_id}/${job_id}`);
    }
    dismiss(r.id);
  };

  if (visible.length === 0) return null;

  return (
    // Portal renders at document.body — visible on every page, outside Router
    <Portal>
      <Box
        position="fixed"
        bottom="24px"
        right="24px"
        zIndex={99999}
        pointerEvents="none"
      >
        <VStack spacing={2.5} align="flex-end" pointerEvents="auto">
          {/* Overflow badge */}
          {overflow > 0 && (
            <HStack
              bg="purple.600" color="white"
              px={3} py={1.5} borderRadius="full"
              fontSize="10px" fontWeight="700"
              spacing={1} cursor="pointer"
              onClick={dismissAll}
              _hover={{ bg: 'purple.700' }}
              boxShadow="md"
            >
              <FiBell size={11} />
              <Text>+{overflow} more · Dismiss all</Text>
            </HStack>
          )}

          {/* Cards — newest on top */}
          {[...visible].reverse().map(r => (
            <ReminderCard
              key={r.id}
              reminder={r}
              snoozeOptions={snoozeOptions}
              onDismiss={dismiss}
              onSnooze={snooze}
              onView={handleView}
            />
          ))}
        </VStack>
      </Box>
    </Portal>
  );
}

export default InterviewReminderOverlay;