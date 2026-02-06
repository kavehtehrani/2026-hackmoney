"use client";

import { useState } from "react";
import { type RouteOption, type RouteTag } from "@/lib/lifi";
import { TokenIcon, ChainIcon } from "@/components/TokenIcon";

interface RouteSelectorProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  toTokenSymbol: string;
}

function TagBadge({ tag }: { tag: RouteTag }) {
  const config: Record<RouteTag, { label: string; className: string }> = {
    RECOMMENDED: {
      label: "Best",
      className: "bg-primary text-primary-foreground",
    },
    FASTEST: {
      label: "Fastest",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    },
    CHEAPEST: {
      label: "Cheapest",
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
    },
    BEST_VALUE: {
      label: "Best Value",
      className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    },
  };

  const { label, className } = config[tag];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function RouteCard({
  route,
  isSelected,
  onSelect,
  toTokenSymbol,
}: {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
  toTokenSymbol: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      {/* Header with tags and bridge name */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {route.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {route.bridgeNames.map((name, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>+</span>}
              <span className="font-medium">{name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-between gap-4">
        {/* Output amount */}
        <div className="flex items-center gap-2">
          <TokenIcon symbol={toTokenSymbol} size={24} />
          <div>
            <p className="font-semibold text-lg">
              {route.toAmountFormatted}
            </p>
            <p className="text-xs text-muted-foreground">{toTokenSymbol}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          {/* Time */}
          <div className="text-center">
            <p className="font-medium">{route.executionDurationFormatted}</p>
            <p className="text-xs text-muted-foreground">Time</p>
          </div>

          {/* Cost */}
          <div className="text-center">
            <p className="font-medium">${route.totalCostUSD}</p>
            <p className="text-xs text-muted-foreground">Cost</p>
          </div>

          {/* Steps */}
          <div className="text-center">
            <p className="font-medium">{route.stepCount}</p>
            <p className="text-xs text-muted-foreground">Steps</p>
          </div>
        </div>
      </div>
    </button>
  );
}

export function RouteSelector({
  routes,
  selectedRouteId,
  onSelectRoute,
  toTokenSymbol,
}: RouteSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  if (routes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No routes found
      </div>
    );
  }

  // If only 1 route, show it without expansion
  if (routes.length === 1) {
    return (
      <div className="space-y-2">
        <RouteCard
          route={routes[0]}
          isSelected={true}
          onSelect={() => onSelectRoute(routes[0].id)}
          toTokenSymbol={toTokenSymbol}
        />
      </div>
    );
  }

  // Show first route + expand button for more
  const visibleRoutes = expanded ? routes : routes.slice(0, 1);
  const hiddenCount = routes.length - 1;

  return (
    <div className="space-y-2">
      {visibleRoutes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          isSelected={selectedRouteId === route.id}
          onSelect={() => onSelectRoute(route.id)}
          toTokenSymbol={toTokenSymbol}
        />
      ))}

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
        >
          <span>Show {hiddenCount} more route{hiddenCount > 1 ? "s" : ""}</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          <span>Show less</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Compact route display for inline use (shows selected route summary)
interface CompactRouteDisplayProps {
  route: RouteOption;
  toTokenSymbol: string;
  onClick?: () => void;
}

export function CompactRouteDisplay({ route, toTokenSymbol, onClick }: CompactRouteDisplayProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/50 transition-colors text-left w-full"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {route.tags.length > 0 && <TagBadge tag={route.tags[0]} />}
        <span className="text-sm font-medium truncate">
          {route.bridgeNames.join(" + ")}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span>{route.toAmountFormatted} {toTokenSymbol}</span>
        <span>{route.executionDurationFormatted}</span>
        <span>${route.totalCostUSD}</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
    </button>
  );
}
