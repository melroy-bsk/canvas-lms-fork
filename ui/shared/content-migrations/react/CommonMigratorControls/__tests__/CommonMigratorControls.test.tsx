/*
 * Copyright (C) 2024 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import {render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommonMigratorControls from '../CommonMigratorControls'
import {Text} from '@instructure/ui-text'

const onSubmit = jest.fn()
const onCancel = jest.fn()
const setIsQuestionBankDisabled = jest.fn()

const renderComponent = (overrideProps?: any) =>
  render(
    <CommonMigratorControls
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrideProps}
      SubmitLabel={TextLabel}
      SubmittingLabel={TextSubmittingLabel}
    />
  )

const TextLabel = () => <Text>Add to Import Queue</Text>
const TextSubmittingLabel = () => <Text>Submitting test</Text>

describe('CommonMigratorControls', () => {
  afterEach(() => jest.clearAllMocks())
  beforeAll(() => {
    window.ENV.QUIZZES_NEXT_ENABLED = true
    window.ENV.NEW_QUIZZES_MIGRATION_DEFAULT = false
    window.ENV.SHOW_BP_SETTINGS_IMPORT_OPTION = true
    window.ENV.NEW_QUIZZES_UNATTACHED_BANK_MIGRATIONS = false
  })

  afterEach(() => jest.clearAllMocks())

  it('calls onSubmit with import_quizzes_next', async () => {
    renderComponent({canImportAsNewQuizzes: true})

    await userEvent.click(
      screen.getByRole('checkbox', {name: /Import existing quizzes as New Quizzes/})
    )
    await userEvent.click(screen.getByRole('button', {name: 'Add to Import Queue'}))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({import_quizzes_next: true}),
      })
    )
  })

  it('calls onSubmit with overwrite_quizzes', async () => {
    renderComponent({canOverwriteAssessmentContent: true})

    await userEvent.click(
      screen.getByRole('checkbox', {name: /Overwrite assessment content with matching IDs/})
    )
    await userEvent.click(screen.getByRole('button', {name: 'Add to Import Queue'}))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({overwrite_quizzes: true}),
      })
    )
  })

  it('calls onSubmit with date_shift_options', async () => {
    renderComponent({canAdjustDates: true})

    await userEvent.click(screen.getByRole('checkbox', {name: 'Adjust events and due dates'}))
    await userEvent.click(screen.getByRole('button', {name: 'Add to Import Queue'}))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        date_shift_options: {
          day_substitutions: [],
          new_end_date: '',
          new_start_date: '',
          old_end_date: '',
          old_start_date: '',
        },
      })
    )
  })

  it('calls onSubmit with selective_import', async () => {
    renderComponent({canSelectContent: true})

    await userEvent.click(screen.getByRole('radio', {name: 'Select specific content'}))
    await userEvent.click(screen.getByRole('button', {name: 'Add to Import Queue'}))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({selective_import: true}))
  })

  it('calls onSubmit with import_blueprint_settings', async () => {
    renderComponent({canSelectContent: true, canImportBPSettings: true})
    await userEvent.click(
      await screen.getByRole('checkbox', {name: 'Import Blueprint Course settings'})
    )
    await userEvent.click(screen.getByRole('button', {name: 'Add to Import Queue'}))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({import_blueprint_settings: true}),
      })
    )
  })

  it('calls onSubmit with all data', async () => {
    renderComponent({
      canSelectContent: true,
      canImportAsNewQuizzes: true,
      canOverwriteAssessmentContent: true,
      canAdjustDates: true,
    })

    await userEvent.click(screen.getByRole('radio', {name: 'Select specific content'}))
    await userEvent.click(screen.getByRole('button', {name: 'Add to Import Queue'}))

    expect(onSubmit).toHaveBeenCalledWith({
      adjust_dates: {
        enabled: false,
        operation: 'shift_dates',
      },
      selective_import: true,
      date_shift_options: {
        day_substitutions: [],
        new_end_date: '',
        new_start_date: '',
        old_end_date: '',
        old_start_date: '',
      },
      errored: false,
      settings: {import_quizzes_next: false, overwrite_quizzes: false},
    })
  })

  it('calls onCancel', async () => {
    renderComponent()
    await userEvent.click(screen.getByRole('button', {name: 'Clear'}))
    expect(onCancel).toHaveBeenCalled()
  })

  it('disable all common fields while uploading', async () => {
    renderComponent({isSubmitting: true, canSelectContent: true})
    expect(screen.getByRole('radio', {name: 'Select specific content'})).toBeInTheDocument()
    expect(screen.getByRole('radio', {name: /All content/})).toBeDisabled()
    expect(screen.getByRole('radio', {name: 'Select specific content'})).toBeDisabled()
    expect(screen.getByRole('button', {name: 'Clear'})).toBeDisabled()
    expect(screen.getByRole('button', {name: /Submitting test/})).toBeDisabled()
  })

  it('disable "events and due" dates optional fields while uploading', async () => {
    const props = {
      canSelectContent: true,
      canImportBPSettings: true,
      canAdjustDates: true,
      canOverwriteAssessmentContent: true,
      canImportAsNewQuizzes: true,
      oldStartDate: '',
      oldEndDate: '',
      newStartDate: '',
      newEndDate: '',
    }
    const {rerender, getByLabelText, getByRole} = renderComponent(props)
    await userEvent.click(getByRole('checkbox', {name: 'Adjust events and due dates'}))
    rerender(
      <CommonMigratorControls
        onSubmit={onSubmit}
        onCancel={onCancel}
        {...props}
        isSubmitting={true}
        fileUploadProgress={10}
        SubmitLabel={TextLabel}
        SubmittingLabel={TextSubmittingLabel}
      />
    )
    expect(getByRole('radio', {name: 'Shift dates'})).toBeInTheDocument()
    expect(getByRole('radio', {name: 'Shift dates'})).toBeDisabled()
    expect(getByRole('radio', {name: 'Remove dates'})).toBeDisabled()
    expect(getByLabelText('Select original beginning date')).toBeDisabled()
    expect(getByLabelText('Select new beginning date')).toBeDisabled()
    expect(getByLabelText('Select original end date')).toBeDisabled()
    expect(getByLabelText('Select new end date')).toBeDisabled()
    expect(getByRole('button', {name: 'Add substitution'})).toBeDisabled()
  })
  it('disable other optional fields while uploading', async () => {
    const props = {
      canSelectContent: true,
      canImportBPSettings: true,
      canAdjustDates: true,
      canOverwriteAssessmentContent: true,
      canImportAsNewQuizzes: true,
      oldStartDate: '',
      oldEndDate: '',
      newStartDate: '',
      newEndDate: '',
    }
    const {rerender, getByLabelText, getByRole} = renderComponent(props)
    await userEvent.click(getByLabelText(/All content/))
    await userEvent.click(getByRole('checkbox', {name: 'Import Blueprint Course settings'}))
    rerender(
      <CommonMigratorControls
        onSubmit={onSubmit}
        onCancel={onCancel}
        {...props}
        isSubmitting={true}
        fileUploadProgress={10}
        SubmitLabel={TextLabel}
        SubmittingLabel={TextSubmittingLabel}
      />
    )
    expect(getByRole('checkbox', {name: 'Import Blueprint Course settings'})).toBeDisabled()
    expect(getByRole('checkbox', {name: /Import existing quizzes as New Quizzes/})).toBeDisabled()
    expect(
      getByRole('checkbox', {name: /Overwrite assessment content with matching IDs/})
    ).toBeDisabled()
  })

  it('call setIsQuestionBankDisabled after "Import existing quizzes as New Quizzes" checked', async () => {
    renderComponent({canImportAsNewQuizzes: true, setIsQuestionBankDisabled})

    await userEvent.click(
      screen.getByRole('checkbox', {name: /Import existing quizzes as New Quizzes/})
    )
    expect(setIsQuestionBankDisabled).toHaveBeenCalledWith(true)
    await userEvent.click(
      screen.getByRole('checkbox', {name: /Import existing quizzes as New Quizzes/})
    )
    expect(setIsQuestionBankDisabled).toHaveBeenCalledWith(false)
  })

  describe('Date fill in', () => {
    const oldStartDateInputSting = '2024-08-08T08:00:00+00:00'
    const oldStartDateExpectedDate = 'Aug 8 at 8am'
    const oldEndDateInputSting = '2024-08-09T08:00:00+00:00'
    const oldEndDateExpectedDate = 'Aug 9 at 8am'
    const newStartDateInputSting = '2024-08-10T08:00:00+00:00'
    const newStartDateExpectedDate = 'Aug 10 at 8am'
    const newEndDateInputSting = '2024-08-11T08:00:00+00:00'
    const newEndDateExpectedDate = 'Aug 11 at 8am'

    const expectDateField = (label: string, value: string) => {
      expect(screen.getByLabelText(label).closest('input')?.value).toBe(value)
    }

    describe('when dates are not provided', () => {
      const props = {
        canAdjustDates: true,
        oldStartDate: undefined,
        oldEndDate: undefined,
        newStartDate: undefined,
        newEndDate: undefined,
      }

      beforeEach(async () => {
        const {getByRole} = renderComponent(props)
        await userEvent.click(getByRole('checkbox', {name: 'Adjust events and due dates'}))
      })

      it('not fills the original beginning date', () => {
        expectDateField('Select original beginning date', '')
      })

      it('not fills the original end date', () => {
        expectDateField('Select original end date', '')
      })

      it('not fills the new beginning date', () => {
        expectDateField('Select new beginning date', '')
      })

      it('not fills the new end date', () => {
        expectDateField('Select new end date', '')
      })
    })

    describe('when dates are provided', () => {
      const props = {
        canAdjustDates: true,
        oldStartDate: oldStartDateInputSting,
        oldEndDate: oldEndDateInputSting,
        newStartDate: newStartDateInputSting,
        newEndDate: newEndDateInputSting,
      }

      beforeEach(async () => {
        const {getByRole} = renderComponent(props)
        await userEvent.click(getByRole('checkbox', {name: 'Adjust events and due dates'}))
      })

      it('not fills the original beginning date', () => {
        expectDateField('Select original beginning date', oldStartDateExpectedDate)
      })

      it('not fills the original end date', () => {
        expectDateField('Select original end date', oldEndDateExpectedDate)
      })

      it('not fills the new beginning date', () => {
        expectDateField('Select new beginning date', newStartDateExpectedDate)
      })

      it('not fills the new end date', () => {
        expectDateField('Select new end date', newEndDateExpectedDate)
      })
    })
  })

  describe('New Quizzes Label', () => {
    const testNewQuizzesLabel = async (
      featureFlag: boolean,
      labelText: string,
      headerText: string,
      bodyText: string
    ) => {
      window.ENV.NEW_QUIZZES_UNATTACHED_BANK_MIGRATIONS = featureFlag
      renderComponent({canImportAsNewQuizzes: true})

      expect(screen.getByText(labelText)).toBeInTheDocument()

      const infoButton = screen
        .getByText('Import assessment as New Quizzes Help Icon')
        .closest('button')

      if (!infoButton) {
        throw new Error('New Quizzes Help button not found')
      }

      await userEvent.click(infoButton)

      within(screen.getByLabelText('Import assessment as New Quizzes Help Modal')).getByText(
        headerText
      )
      expect(screen.getByText(bodyText)).toBeInTheDocument()
      expect(
        screen.getByText('To learn more, please contact your system administrator or visit')
      ).toBeInTheDocument()
      expect(screen.getByText('Canvas Instructor Guide')).toBeInTheDocument()
    }

    it('renders convert new quizzes text when feature flag is enabled', async () => {
      await testNewQuizzesLabel(
        true,
        'Convert content to New Quizzes',
        'Convert Quizzes',
        'Existing question banks and classic quizzes will be imported as Item Banks and New Quizzes.'
      )
    })

    it('renders import new quizzes text when feature flag is disabled', async () => {
      await testNewQuizzesLabel(
        false,
        'Import existing quizzes as New Quizzes',
        'New Quizzes',
        'New Quizzes is the new assessment engine for Canvas.'
      )
    })
  })
})
