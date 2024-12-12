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
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {TraditionalView} from '../TraditionalView'
import type {RubricCriterion, RubricAssessmentData} from '../../types/rubric'

const defaultCriteria: RubricCriterion[] = [
  {
    id: 'criterion_1',
    description: 'First Criterion',
    longDescription: 'Detailed description of first criterion',
    points: 5,
    learningOutcomeId: undefined,
    masteryPoints: undefined,
    ignoreForScoring: false,
    criterionUseRange: false,
    ratings: [
      {
        id: 'rating_1',
        description: 'Full Marks',
        longDescription: 'Student demonstrates excellent understanding',
        points: 5,
      },
      {
        id: 'rating_2',
        description: 'Partial Marks',
        longDescription: 'Student demonstrates partial understanding',
        points: 3,
      },
    ],
  },
]

const defaultAssessmentData: RubricAssessmentData[] = [
  {
    criterionId: 'criterion_1',
    points: 5,
    comments: '',
    id: 'rating_1',
    commentsEnabled: true,
    description: 'Full Marks',
  },
]

describe('TraditionalView', () => {
  const defaultProps = {
    criteria: defaultCriteria,
    hidePoints: false,
    isPreviewMode: false,
    isFreeFormCriterionComments: false,
    ratingOrder: 'descending',
    rubricAssessmentData: defaultAssessmentData,
    rubricTitle: 'Test Rubric',
    onUpdateAssessmentData: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the rubric title', () => {
    render(<TraditionalView {...defaultProps} />)
    expect(screen.getByText('Test Rubric')).toBeInTheDocument()
  })

  it('renders without points when hidePoints is true', () => {
    render(<TraditionalView {...defaultProps} hidePoints={true} />)
    expect(screen.queryByText('5 pts')).not.toBeInTheDocument()
  })

  it('renders in preview mode correctly', () => {
    render(<TraditionalView {...defaultProps} isPreviewMode={true} />)
    const view = screen.getByTestId('rubric-assessment-traditional-view')
    expect(view).toHaveAttribute('data-testid', 'rubric-assessment-traditional-view')
  })

  it('displays criterion descriptions', () => {
    render(<TraditionalView {...defaultProps} />)
    expect(screen.getByText('First Criterion')).toBeInTheDocument()
  })

  it('displays rating descriptions', () => {
    render(<TraditionalView {...defaultProps} />)
    expect(screen.getByText('Full Marks')).toBeInTheDocument()
    expect(screen.getByText('Partial Marks')).toBeInTheDocument()
  })

  it('handles assessment data updates', async () => {
    const user = userEvent.setup()
    const onUpdateAssessmentData = jest.fn()

    render(
      <TraditionalView
        {...defaultProps}
        onUpdateAssessmentData={onUpdateAssessmentData}
        isFreeFormCriterionComments={true}
      />
    )

    const commentInput = screen.getByTestId('free-form-comment-area-criterion_1')
    await user.type(commentInput, 'Test comment')
    await user.tab() // Trigger onBlur to update assessment data

    expect(onUpdateAssessmentData).toHaveBeenCalledWith(
      expect.objectContaining({
        criterionId: 'criterion_1',
        comments: 'Test comment',
      })
    )
  })
})
