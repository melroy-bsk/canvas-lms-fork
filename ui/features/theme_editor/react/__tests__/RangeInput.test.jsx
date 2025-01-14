/*
 * Copyright (C) 2016 - present Instructure, Inc.
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
import ReactDOM from 'react-dom'
import RangeInput from '../RangeInput'
import sinon from 'sinon'

const ok = value => expect(value).toBeTruthy()
const equal = (value, expected) => expect(value).toEqual(expected)

let elem, props

describe('RangeInput Component', () => {
  beforeEach(() => {
    elem = document.createElement('div')
    props = {
      min: 1,
      max: 10,
      defaultValue: 5,
      labelText: 'Input Label',
      name: 'input_name',
      formatValue: sinon.stub(),
      onChange: sinon.stub(),
    }
  })

  test('renders range input', () => {
    // eslint-disable-next-line react/no-render-return-value, no-restricted-properties
    const component = ReactDOM.render(<RangeInput {...props} />, elem)
    const input = component.rangeInput
    equal(input.type, 'range', 'renders range input')
    equal(String(input.value), String(props.defaultValue), 'renders default value')
    equal(input.name, props.name, 'renders with name from props')
  })

  test('renders formatted output', done => {
    // eslint-disable-next-line react/no-render-return-value, no-restricted-properties
    const component = ReactDOM.render(<RangeInput {...props} />, elem)
    const expected = 47
    const expectedFormatted = '47%'
    props.formatValue.returns(expectedFormatted)
    component.setState({value: 47}, () => {
      const output = component.outputElement
      ok(output, 'renders the output element')
      ok(props.formatValue.calledWith(expected), 'formats the value')
      equal(output.textContent, expectedFormatted, 'outputs value')
      done()
    })
  })

  test('handleChange', () => {
    // eslint-disable-next-line react/no-render-return-value, no-restricted-properties
    const component = ReactDOM.render(<RangeInput {...props} />, elem)
    sinon.spy(component, 'setState')
    const event = {target: {value: 8}}
    component.handleChange(event)
    ok(component.setState.calledWithMatch({value: event.target.value}), 'updates value in state')
    ok(props.onChange.calledWith(event.target.value), 'calls onChange with the new value')
  })
})
