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

import type {Control, FieldErrors} from 'react-hook-form'

export const getFormErrorMessage = <T extends {}>(errors: FieldErrors<T>, fieldName: keyof T) => {
  const errorMessage = errors[fieldName]?.message

  return errorMessage ? [{text: errorMessage, type: 'error'} as const] : []
}

export const focusFiled = <T extends {}>(control: Control<T, any>, fieldName: keyof T) => {
  control._fields[fieldName]?._f.ref.focus?.()
}
