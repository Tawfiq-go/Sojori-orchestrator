/**
 * Unified API Badges - Badges contextuels (channel, trigger type, etc.)
 */

import React from 'react';
import type { UnifiedApiCall } from '../../types/unified-api-call';

/**
 * Badge générique
 */
interface BadgeProps {
  color: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray' | 'yellow';
  icon?: string;
  children: React.ReactNode;
  size?: 'sm' | 'base';
}

const BADGE_COLORS = {
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray: 'bg-slate-50 text-slate-700 border-slate-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export function Badge({ color, icon, children, size = 'sm' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border ${BADGE_COLORS[color]} ${sizeClasses} font-semibold`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Badges contextuels adaptatifs selon source
 */
export function ContextBadges({ call }: { call: UnifiedApiCall }) {
  const badges: React.ReactNode[] = [];

  // Channel (Airbnb, Booking, RU, etc.)
  if (call.channel) {
    const channelColors: Record<string, BadgeProps['color']> = {
      airbnb: 'red',
      booking: 'blue',
      ru: 'orange',
      other: 'gray',
    };
    const color = channelColors[call.channel.toLowerCase()] || 'gray';
    badges.push(
      <Badge key="channel" color={color} icon="🏨">
        {call.channel}
      </Badge>
    );
  }

  // Trigger type (Auto vs Manual)
  if (call.triggeredBy) {
    const isAuto =
      call.triggeredBy.includes('cron') ||
      call.triggeredBy.includes('event') ||
      call.triggeredBy.includes('timeslot') ||
      call.triggeredBy.includes('webhook');

    badges.push(
      <Badge key="trigger" color={isAuto ? 'blue' : 'orange'} icon={isAuto ? '⚡' : '👤'}>
        {isAuto ? 'Auto' : 'Manual'}
      </Badge>
    );
  }

  // Owner
  if (call.ownerName || call.ownerId) {
    badges.push(
      <Badge key="owner" color="gray" icon="👤">
        {call.ownerName || call.ownerId}
      </Badge>
    );
  }

  // Listing
  if (call.listingName || call.listingId) {
    badges.push(
      <Badge key="listing" color="green" icon="🏠">
        {call.listingName || call.listingId}
      </Badge>
    );
  }

  // Reservation
  if (call.reservationCode || call.reservationId) {
    badges.push(
      <Badge key="reservation" color="purple" icon="📅">
        {call.reservationCode || call.reservationId}
      </Badge>
    );
  }

  return <div className="flex gap-1 flex-wrap">{badges}</div>;
}
