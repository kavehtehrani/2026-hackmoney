"use client";

import { useState } from "react";
import type { ENSProfile } from "@/lib/ens";

interface ENSProfileCardProps {
  profile: ENSProfile;
  size?: "sm" | "md";
}

export function ENSProfileCard({ profile, size = "md" }: ENSProfileCardProps) {
  const [imageError, setImageError] = useState(false);

  const avatarSize = size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      {/* Avatar */}
      {profile.avatar && !imageError ? (
        <img
          src={profile.avatar}
          alt={profile.name}
          className={`${avatarSize} rounded-full object-cover shrink-0`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`${avatarSize} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0`}
        >
          <span className="text-lg font-bold text-primary">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${textSize} truncate`}>{profile.name}</p>

        {profile.address && (
          <p className="text-xs font-mono text-muted-foreground truncate">
            {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
          </p>
        )}

        {profile.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {profile.description}
          </p>
        )}

        {/* Social links */}
        {(profile.twitter || profile.github || profile.website) && (
          <div className="flex items-center gap-2 mt-2">
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={`@${profile.twitter.replace("@", "")}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={profile.github}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={profile.website}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Mini avatar component for inline display
interface ENSAvatarProps {
  avatar: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function ENSAvatar({ avatar, name, size = 24, className = "" }: ENSAvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (avatar && !imageError) {
    return (
      <img
        src={avatar}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="font-bold text-primary"
        style={{ fontSize: size * 0.4 }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
