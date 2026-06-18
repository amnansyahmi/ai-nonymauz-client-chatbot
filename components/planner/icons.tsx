import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };
}

export function MenuDashboardIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
    </svg>
  );
}

export function MenuChatIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M5 5h14v10H8l-3 3V5Z" />
    </svg>
  );
}

export function MenuChecklistIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="m5 7 2 2 4-4M13 8h6M5 15l2 2 4-4M13 16h6" />
    </svg>
  );
}

export function MenuCalendarIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M7 3v4M17 3v4M4 9h16M5 5h14v15H5z" />
    </svg>
  );
}

export function MenuBudgetIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M4 7h16v11H4zM4 10h16M8 15h4" />
    </svg>
  );
}

export function MenuGuestsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M16 15a5 5 0 0 1 5 5" />
    </svg>
  );
}

export function MenuVendorsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M6 10h12l-1 10H7L6 10ZM9 10a3 3 0 0 1 6 0M8 14h8" />
    </svg>
  );
}

export function RobotIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M12 4V2M8 4h8a4 4 0 0 1 4 4v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8a4 4 0 0 1 4-4Z" />
      <path d="M8 12h.01M16 12h.01M9 16h6" />
    </svg>
  );
}

export function HistoryIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68" />
      <path d="M4 4v4.68h4.68M12 7v5l3 2" />
    </svg>
  );
}

export function CloseIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function TrashIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

export function SunIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function MoonIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </svg>
  );
}

export function ThumbsUpIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M7 10v11" />
      <path d="M3 11h4v10H3zM7 10l4-7c1.5 0 2 1 2 2.5L13 10h5.5a2.5 2.5 0 0 1 2.5 2.8l-1.3 6.5A2.5 2.5 0 0 1 17.2 21H7" />
    </svg>
  );
}

export function ThumbsDownIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M17 14V3" />
      <path d="M21 13h-4V3h4zM17 14l-4 7c-1.5 0-2-1-2-2.5L11 14H5.5A2.5 2.5 0 0 1 3 11.2L4.3 4.7A2.5 2.5 0 0 1 6.8 3H17" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...baseProps(size)} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export type MenuIconName =
  | 'dashboard'
  | 'chat'
  | 'checklist'
  | 'calendar'
  | 'budget'
  | 'guests'
  | 'vendors';

export function MenuIcon({ name, size = 18, ...rest }: IconProps & { name: MenuIconName }) {
  switch (name) {
    case 'dashboard':
      return <MenuDashboardIcon size={size} {...rest} />;
    case 'chat':
      return <MenuChatIcon size={size} {...rest} />;
    case 'checklist':
      return <MenuChecklistIcon size={size} {...rest} />;
    case 'calendar':
      return <MenuCalendarIcon size={size} {...rest} />;
    case 'budget':
      return <MenuBudgetIcon size={size} {...rest} />;
    case 'guests':
      return <MenuGuestsIcon size={size} {...rest} />;
    case 'vendors':
      return <MenuVendorsIcon size={size} {...rest} />;
    default:
      return null;
  }
}
