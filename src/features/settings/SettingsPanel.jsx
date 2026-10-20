import { useEffect, useState } from 'react';
import { User, Lock, Bell, Palette, KeyRound } from 'lucide-react';
import { Modal } from '../../components/Modal.jsx';
import { ProfileSection } from './sections/ProfileSection.jsx';
import { PrivacySection } from './sections/PrivacySection.jsx';
import { NotificationsSection } from './sections/NotificationsSection.jsx';
import { AppearanceSection } from './sections/AppearanceSection.jsx';
import { AccountSection } from './sections/AccountSection.jsx';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, Component: ProfileSection },
  { id: 'privacy', label: 'Privacy', icon: Lock, Component: PrivacySection },
  { id: 'notifications', label: 'Notifications', icon: Bell, Component: NotificationsSection },
  { id: 'appearance', label: 'Appearance', icon: Palette, Component: AppearanceSection },
  { id: 'account', label: 'Account', icon: KeyRound, Component: AccountSection },
];

// One settings home: section list on the left (a scrolling tab row on
// narrow screens), the active section on the right.
export function SettingsPanel({ isOpen, onClose, initialSection = 'profile' }) {
  const [active, setActive] = useState(initialSection);

  useEffect(() => {
    if (isOpen) setActive(initialSection);
  }, [isOpen, initialSection]);

  const current = SECTIONS.find((s) => s.id === active) || SECTIONS[0];
  const Section = current.Component;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="max-w-2xl">
      <div className="flex flex-col md:flex-row gap-4 md:min-h-[22rem]">
        <nav
          aria-label="Settings sections"
          className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-44 flex-shrink-0 -mx-1 px-1"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              aria-current={active === id ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-fast ${
                active === id
                  ? 'bg-accentSubtle text-accent-primary'
                  : 'text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary mb-3">{current.label}</h3>
          <Section />
        </div>
      </div>
    </Modal>
  );
}
