'use client'

import { useState } from 'react'
import { Tabs } from '../Tabs'
import { RosterManager } from '../RosterManager'
import { EventGroupsManager } from '../EventGroupsManager'

export function StaffSettingsClient() {
  const [tab, setTab] = useState('team')
  return (
    <main className="min-h-dvh bg-beige-light p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="font-heading text-brown text-3xl">Staff Settings</h1>
          <p className="font-body text-brown-light text-sm mt-1">Who works here, and who can log in.</p>
        </div>
        <Tabs
          tabs={[
            { key: 'team', label: 'Team' },
            { key: 'groups', label: 'Event Groups' },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'team' && <RosterManager />}
        {tab === 'groups' && <EventGroupsManager />}
      </div>
    </main>
  )
}
