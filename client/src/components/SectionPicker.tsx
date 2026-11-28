import { Check } from 'lucide-react'
import type { RefObject } from 'react'

import type { Section } from '../schemas/models'

interface SectionPickerProps {
  legend: string
  isLegendHidden?: boolean
  sections: Section[]
  currentSectionId?: string
  pendingSectionId?: string
  savedSectionId?: string
  savedNote: string
  isDisabled: boolean
  isFirstChoiceAutoFocused?: boolean
  firstChoiceRef?: RefObject<HTMLButtonElement | null>
  describedBy?: string
  getActionLabel: (section: Section) => string
  onPick: (section: Section) => void
}

/** Lists store sections as buttons so one tap both chooses a section and commits the change. */
export const SectionPicker = ({
  legend,
  isLegendHidden = false,
  sections,
  currentSectionId,
  pendingSectionId,
  savedSectionId,
  savedNote,
  isDisabled,
  isFirstChoiceAutoFocused = false,
  firstChoiceRef,
  describedBy,
  getActionLabel,
  onPick,
}: SectionPickerProps) => {
  const firstChoiceId = sections.find((section) => section.id !== currentSectionId)?.id
  return (
    <fieldset className="section-picker" aria-describedby={describedBy}>
      <legend className={isLegendHidden ? 'sr-only' : 'section-picker-legend'}>{legend}</legend>
      <ul className="section-picker-list">
        {sections.map((section) => {
          if (section.id === currentSectionId) {
            return (
              <li key={section.id} className="section-choice is-current">
                <span className="section-choice-name">{section.name}</span>
                <span className="section-choice-note">Current</span>
              </li>
            )
          }
          const isFirstChoice = section.id === firstChoiceId
          const isSaved = savedSectionId === section.id
          return (
            <li key={section.id}>
              <button
                ref={isFirstChoice ? firstChoiceRef : undefined}
                autoFocus={isFirstChoice && isFirstChoiceAutoFocused}
                type="button"
                className={`section-choice ${isSaved ? 'is-saved' : ''}`}
                disabled={isDisabled}
                aria-label={getActionLabel(section)}
                onClick={() => onPick(section)}
              >
                <span className="section-choice-name">{section.name}</span>
                {isSaved ? (
                  <span className="section-choice-note is-saved">
                    <Check size={18} aria-hidden="true" />
                    {savedNote}
                  </span>
                ) : (
                  pendingSectionId === section.id && <span className="section-choice-note">Saving...</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
