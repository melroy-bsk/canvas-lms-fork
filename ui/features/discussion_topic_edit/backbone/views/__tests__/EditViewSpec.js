/*
 * Copyright (C) 2015 - present Instructure, Inc.
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

import $ from 'jquery'
import 'jquery-migrate'
import {extend, defer} from 'lodash'
import RCELoader from '@canvas/rce/serviceRCELoader'
import SectionCollection from '@canvas/sections/backbone/collections/SectionCollection'
import DueDateList from '@canvas/due-dates/backbone/models/DueDateList'
import Section from '@canvas/sections/backbone/models/Section'
import DiscussionTopic from '@canvas/discussions/backbone/models/DiscussionTopic'
import Announcement from '@canvas/discussions/backbone/models/Announcement'
import DueDateOverrideView from '@canvas/due-dates'
import EditView from '../EditView'
import AssignmentGroupCollection from '@canvas/assignments/backbone/collections/AssignmentGroupCollection'
import fakeENV from '@canvas/test-utils/fakeENV'
import assertions from '@canvas/test-utils/assertionsSpec'
import '@canvas/jquery/jquery.simulate'

const currentOrigin = window.location.origin

EditView.prototype.loadNewEditor = () => {}

const editView = function (opts = {}, discussOpts = {}) {
  const ModelClass = opts.isAnnouncement ? Announcement : DiscussionTopic
  if (opts.withAssignment) {
    const assignmentOpts = extend({}, opts.assignmentOpts, {
      name: 'Test Assignment',
      assignment_overrides: [],
      graded_submissions_exist: true,
    })
    discussOpts.assignment = assignmentOpts
  }
  const discussion = new ModelClass(discussOpts, {parse: true})
  const assignment = discussion.get('assignment')
  const sectionList = new SectionCollection([Section.defaultDueDateSection()])
  const dueDateList = new DueDateList(
    assignment.get('assignment_overrides'),
    sectionList,
    assignment
  )
  const app = new EditView({
    model: discussion,
    permissions: opts.permissions || {},
    views: {
      'js-assignment-overrides': new DueDateOverrideView({
        model: dueDateList,
        views: {},
      }),
    },
    lockedItems: opts.lockedItems || {},
    isEditing: false,
    anonymousState: ENV?.DISCUSSION_TOPIC?.ATTRIBUTES?.anonymous_state,
    react_discussions_post: ENV.REACT_DISCUSSIONS_POST,
    allow_student_anonymous_discussion_topics: ENV.allow_student_anonymous_discussion_topics,
    context_is_not_group: ENV.context_is_not_group,
  })
  ;(app.assignmentGroupCollection = new AssignmentGroupCollection()).contextAssetString =
    ENV.context_asset_string
  return app.render()
}
const nameLengthHelper = function (
  view,
  length,
  maxNameLengthRequiredForAccount,
  maxNameLength,
  postToSis
) {
  ENV.MAX_NAME_LENGTH_REQUIRED_FOR_ACCOUNT = maxNameLengthRequiredForAccount
  ENV.MAX_NAME_LENGTH = maxNameLength
  ENV.IS_LARGE_ROSTER = true
  ENV.CONDITIONAL_RELEASE_SERVICE_ENABLED = false
  const title = 'a'.repeat(length)
  const {assignment} = view
  assignment.attributes.post_to_sis = postToSis
  return view.validateBeforeSave(
    {
      title,
      set_assignment: '1',
      assignment,
    },
    []
  )
}

QUnit.module('EditView', {
  setup() {
    fakeENV.setup()
    this.server = sinon.fakeServer.create({respondImmediately: true})
    sandbox.fetch.mock('path:/api/v1/courses/1/lti_apps/launch_definitions', 200)

    RCELoader.RCE = null
    return RCELoader.loadRCE()
  },
  teardown() {
    this.server.restore()
    fakeENV.teardown()
  },
  editView() {
    return editView.apply(this, arguments)
  },
})

test('it should be accessible', function (assert) {
  const done = assert.async()
  assertions.isAccessible(this.editView(), () => done(), {a11yReport: true})
})

test('renders', function () {
  const view = this.editView()
  ok(view)
})

test('shows error message on assignment point change with submissions', function () {
  const view = this.editView({
    withAssignment: true,
    assignmentOpts: {has_submitted_submissions: true},
  })
  view.renderGroupCategoryOptions()
  ok(view.$el.find('#discussion_point_change_warning'), 'rendered change warning')
  view.$el.find('#discussion_topic_assignment_points_possible').val(1)
  view.$el.find('#discussion_topic_assignment_points_possible').trigger('change')
  equal(
    view.$el.find('#discussion_point_change_warning').attr('aria-expanded'),
    'true',
    'change warning aria-expanded true'
  )
  view.$el.find('#discussion_topic_assignment_points_possible').val(0)
  view.$el.find('#discussion_topic_assignment_points_possible').trigger('change')
  equal(
    view.$el.find('#discussion_point_change_warning').attr('aria-expanded'),
    'false',
    'change warning aria-expanded false'
  )
})

test('hides the published icon for announcements', function () {
  const view = this.editView({isAnnouncement: true})
  equal(view.$el.find('.published-status').length, 0)
})

test('validates the group category for non-assignment discussions', function () {
  const clock = sinon.useFakeTimers()
  const view = this.editView({permissions: {CAN_SET_GROUP: true}})
  clock.tick(1)
  const data = {group_category_id: 'blank'}
  const errors = view.validateBeforeSave(data, [])
  ok(errors.newGroupCategory[0].message)
  return clock.restore()
})

test('does not render #podcast_has_student_posts_container for non-course contexts', function () {
  const view = this.editView({
    withAssignment: true,
    permissions: {CAN_MODERATE: true},
  })
  equal(view.$el.find('#podcast_enabled').length, 1)
  equal(view.$el.find('#podcast_has_student_posts_container').length, 0)
})

test('routes to discussion details normally', function () {
  const view = this.editView({}, {html_url: currentOrigin + '/foo'})
  equal(view.locationAfterSave({}), currentOrigin + '/foo')
})

test('routes to return_to', function () {
  const view = this.editView({}, {html_url: currentOrigin + '/foo'})
  equal(view.locationAfterSave({return_to: currentOrigin + '/bar'}), currentOrigin + '/bar')
})

test('does not route to return_to with javascript protocol', function () {
  const view = this.editView({}, {html_url: currentOrigin + '/foo'})
  // eslint-disable-next-line no-script-url
  equal(view.locationAfterSave({return_to: 'javascript:alert(1)'}), currentOrigin + '/foo')
})

test('does not route to return_to in remote origin', function () {
  const view = this.editView({}, {html_url: currentOrigin + '/foo'})
  equal(view.locationAfterSave({return_to: 'http://evil.com'}), currentOrigin + '/foo')
})

test('cancels to env normally', function () {
  ENV.CANCEL_TO = currentOrigin + '/foo'
  const view = this.editView()
  equal(view.locationAfterCancel({}), currentOrigin + '/foo')
})

test('cancels to return_to', function () {
  ENV.CANCEL_TO = currentOrigin + '/foo'
  const view = this.editView()
  equal(view.locationAfterCancel({return_to: currentOrigin + '/bar'}), currentOrigin + '/bar')
})

test('does not cancel to return_to with javascript protocol', function () {
  ENV.CANCEL_TO = currentOrigin + '/foo'
  const view = this.editView()
  // eslint-disable-next-line no-script-url
  equal(view.locationAfterCancel({return_to: 'javascript:alert(1)'}), currentOrigin + '/foo')
})

test('shows todo checkbox', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const view = this.editView()
  equal(view.$el.find('#allow_todo_date').length, 1)
  equal(view.$el.find('#todo_date_input')[0].style.display, 'none')
})

test('shows todo input when todo checkbox is selected', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const view = this.editView()
  equal(view.$el.find('#todo_date_input')[0].style.display, 'none')
  view.$el.find('#allow_todo_date').prop('checked', true)
  view.$el.find('#allow_todo_date').trigger('change')
  notStrictEqual(view.$el.find('#todo_date_input')[0].style.display, 'none')
})

test('shows todo input with date when given date', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  ENV.TIMEZONE = 'America/Chicago'
  const view = this.editView({}, {todo_date: '2017-01-03'})
  equal(view.$el.find('#allow_todo_date').prop('checked'), true)
  equal(view.$el.find('input[name="todo_date"]').val(), 'Jan 2, 2017, 6:00 PM')
})

test('renders announcement page when planner enabled', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const view = this.editView({isAnnouncement: true})
  equal(view.$el.find('#discussion-edit-view').length, 1)
})

test('does not show todo checkbox without permission', function () {
  ENV.STUDENT_PLANNER_ENABLED = false
  const view = this.editView()
  equal(view.$el.find('#allow_todo_date').length, 0)
})

test('does not show todo date elements when grading is enabled', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const view = this.editView()
  view.$el.find('#use_for_grading').prop('checked', true)
  view.$el.find('#use_for_grading').trigger('change')
  equal(view.$el.find('#todo_options')[0].style.display, 'none')
})

test('does retain the assignment when user with assignment-edit permission edits discussion', function () {
  const view = this.editView({
    withAssignment: true,
    permissions: {CAN_UPDATE_ASSIGNMENT: true, CAN_CREATE_ASSIGNMENT: false},
  })
  const formData = view.getFormData()
  equal(formData.set_assignment, '1')
})

test('does save todo date if allow_todo_date is checked and discussion is not graded', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const todo_date = new Date('2017-05-25T08:00:00-0800')
  const view = this.editView()
  view.renderGroupCategoryOptions()
  view.$el.find('#allow_todo_date').prop('checked', true)
  view.$el.find('#allow_todo_date').trigger('change')
  view.$el.find('input[name="todo_date"]').val(todo_date.toISOString())
  view.$el.find('input[name="todo_date"]').trigger('change')
  const formData = view.getFormData()
  equal(formData.todo_date.toString(), todo_date.toString())
})

test('does not save todo date if allow_todo_date is not checked', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const view = this.editView()
  view.$el.find('#todo_date').val('2017-01-03')
  view.$el.find('#todo_date').trigger('change')
  view.renderGroupCategoryOptions()
  const formData = view.getFormData()
  equal(formData.todo_date, null)
})

test('does not save todo date if discussion is graded', function () {
  ENV.STUDENT_PLANNER_ENABLED = true
  const view = this.editView()
  view.$el.find('#todo_date').val('2017-01-03')
  view.$el.find('#todo_date').trigger('change')
  view.$el.find('#use_for_grading').prop('checked', true)
  view.$el.find('#use_for_grading').trigger('change')
  view.renderGroupCategoryOptions()
  const formData = view.getFormData()
  equal(formData.todo_date, null)
})

test('does not renders anonymous section if is a group discussion', function () {
  ENV.REACT_DISCUSSIONS_POST = true
  ENV.context_is_not_group = false
  const view = this.editView({
    permissions: {CAN_MODERATE: true},
  })
  equal(view.$el.find('#anonymous_section_header').length, 0)
})

test('renders anonymous section if able to moderate', function () {
  ENV.REACT_DISCUSSIONS_POST = true
  ENV.context_is_not_group = true
  const view = this.editView({
    permissions: {CAN_MODERATE: true},
  })
  equal(view.$el.find('#anonymous_section_header').length, 1)
})

test('renders anonymous section if student can create', function () {
  ENV.REACT_DISCUSSIONS_POST = true
  ENV.context_is_not_group = true
  ENV.allow_student_anonymous_discussion_topics = true
  const view = this.editView({})
  equal(view.$el.find('#anonymous_section_header').length, 1)
})

test('renders anonymous section with anonymous discussions off checked', function () {
  ENV.REACT_DISCUSSIONS_POST = true
  ENV.context_is_not_group = true
  ENV.DISCUSSION_TOPIC = {ATTRIBUTES: {anonymous_state: null}}
  const view = this.editView({
    permissions: {CAN_MODERATE: true},
  })
  equal(view.$el.find('input[name=anonymous_state][value=null]:checked').length, 1)
})

test('renders anonymous section with full_anonymity checked', function () {
  ENV.REACT_DISCUSSIONS_POST = true
  ENV.context_is_not_group = true
  ENV.DISCUSSION_TOPIC = {ATTRIBUTES: {anonymous_state: 'full_anonymity'}}
  const view = this.editView({
    permissions: {CAN_MODERATE: true},
  })
  equal(view.$el.find('input[name=anonymous_state][value=full_anonymity]:checked').length, 1)
})

test("renders 'points' as editable when user has grade-edit permissions", function () {
  const view = this.editView({
    permissions: {CAN_EDIT_GRADES: true},
    withAssignment: true,
  })
  notOk(view.$el.find('#discussion_topic_assignment_points_possible').attr('readonly'))
})

test("renders 'points' as readonly when user has grade-edit permissions", function () {
  const view = this.editView({
    permissions: {CAN_EDIT_GRADES: false},
    withAssignment: true,
  })
  ok(view.$el.find('#discussion_topic_assignment_points_possible').attr('readonly'))
})

test('handleMessageEvent sets ab_guid when subject is assignment.set_ab_guid and the ab_guid is formatted correctly', function () {
  const view = this.editView({
    withAssignment: true,
  })

  const mockEvent = {
    data: {
      subject: 'assignment.set_ab_guid',
      data: ['1E20776E-7053-11DF-8EBF-BE719DFF4B22', '1e20776e-7053-11df-8eBf-Be719dff4b22'],
    },
  }

  view.handleMessageEvent(mockEvent)

  deepEqual(
    view.assignment.get('ab_guid'),
    ['1E20776E-7053-11DF-8EBF-BE719DFF4B22', '1e20776e-7053-11df-8eBf-Be719dff4b22'],
    'ab_guid should be set correctly'
  )
})

test('handleMessageEvent does not set ab_guid when subject is not assignment.set_ab_guid', function () {
  const view = this.editView({
    withAssignment: true,
  })

  const mockEvent = {
    data: {
      subject: 'some.other.subject',
      data: ['1E20776E-7053-11DF-8EBF-BE719DFF4B22', '1e20776e-7053-11df-8eBf-Be719dff4b22'],
    },
  }

  view.handleMessageEvent(mockEvent)

  notDeepEqual(
    view.assignment.has('ab_guid'),
    ['not_an_ab_guid', '1e20776e-7053-11df-8eBf-Be719dff4b22'],
    'ab_guid should not be set'
  )
})

test('handleMessageEvent does not set ab_guid when the ab_guid is not formatted correctly', function () {
  const view = this.editView({
    withAssignment: true,
  })

  const mockEvent = {
    data: {
      subject: 'assignment.set_ab_guid',
      data: ['not_an_ab_guid', '1e20776e-7053-11df-8eBf-Be719dff4b22'],
    },
  }

  view.handleMessageEvent(mockEvent)

  notDeepEqual(
    view.assignment.has('ab_guid'),
    ['not_an_ab_guid', '1e20776e-7053-11df-8eBf-Be719dff4b22'],
    'ab_guid should not be set'
  )
})

QUnit.module(
  'EditView - Sections Specific',
  test('allows discussion to save when section specific has errors has no section', function () {
    ENV.SECTION_SPECIFIC_ANNOUNCEMENTS_ENABLED = true
    ENV.DISCUSSION_TOPIC = {ATTRIBUTES: {is_announcement: false}}
    const view = this.editView({withAssignment: true})
    const title = 'a'.repeat(10)
    const {assignment} = view
    assignment.attributes.post_to_sis = '1'
    const errors = view.validateBeforeSave(
      {
        title,
        set_assignment: '1',
        assignment,
        specific_sections: null,
      },
      []
    )
    equal(Object.keys(errors).length, 0)
  }),
  test('allows announcement to save when section specific has a section', function () {
    ENV.SECTION_SPECIFIC_ANNOUNCEMENTS_ENABLED = true
    ENV.DISCUSSION_TOPIC = {ATTRIBUTES: {is_announcement: true}}
    const view = this.editView({withAssignment: false})
    const title = 'a'.repeat(10)
    const {assignment} = view
    assignment.attributes.post_to_sis = '1'
    const errors = view.validateBeforeSave(
      {
        title,
        specific_sections: ['fake_section'],
      },
      []
    )
    equal(Object.keys(errors).length, 0)
  }),
  test('allows group announcements to be saved without a section', function () {
    ENV.SECTION_SPECIFIC_ANNOUNCEMENTS_ENABLED = true
    ENV.CONTEXT_ID = 1
    ENV.context_asset_string = 'group_1'
    ENV.DISCUSSION_TOPIC = {ATTRIBUTES: {is_announcement: true}}
    const view = this.editView({withAssignment: false})
    const title = 'a'.repeat(10)
    const {assignment} = view
    assignment.attributes.post_to_sis = '1'
    const errors = view.validateBeforeSave(
      {
        title,
        specific_sections: null,
      },
      []
    )
    equal(Object.keys(errors).length, 0)
  }),
  test('require section for course announcements if enabled', function () {
    ENV.should_log = true
    ENV.SECTION_SPECIFIC_ANNOUNCEMENTS_ENABLED = true
    ENV.CONTEXT_ID = 1
    ENV.context_asset_string = 'course_1'
    ENV.DISCUSSION_TOPIC = {ATTRIBUTES: {is_announcement: true}}
    const view = this.editView({withAssignment: false})
    const title = 'a'.repeat(10)
    const {assignment} = view
    assignment.attributes.post_to_sis = '1'
    const errors = view.validateBeforeSave(
      {
        title,
        specific_sections: null,
      },
      []
    )
    equal(Object.keys(errors).length, 1)
    equal(Object.keys(errors)[0], 'specific_sections')
  })
)

QUnit.module('EditView - Usage Rights', {
  setup() {
    fakeENV.setup()
    ENV.USAGE_RIGHTS_REQUIRED = true
    ENV.PERMISSIONS.manage_files = true
    this.server = sinon.fakeServer.create({respondImmediately: true})
    sandbox.fetch.mock('http://api/folders?contextType=user&contextId=1', 200)
    sandbox.fetch.mock('path:/api/session', 200)
  },
  teardown() {
    this.server.restore()
    fakeENV.teardown()
  },
  editView() {
    return editView.apply(this, arguments)
  },
})

test('renders usage rights control', function () {
  const view = this.editView({permissions: {CAN_ATTACH: true}})
  equal(view.$el.find('#usage_rights_control').length, 1)
})

QUnit.module('EditView - ConditionalRelease', {
  setup() {
    fakeENV.setup()
    ENV.CONDITIONAL_RELEASE_SERVICE_ENABLED = true
    ENV.CONDITIONAL_RELEASE_ENV = {
      assignment: {id: 1},
    }
    $(document).on('submit', () => false)
    this.server = sinon.fakeServer.create({respondImmediately: true})
    sandbox.fetch.mock('path:/api/v1/courses/1/lti_apps/launch_definitions', 200)
  },
  teardown() {
    this.server.restore()
    fakeENV.teardown()
    return $(document).off('submit')
  },
  editView() {
    return editView.apply(this, arguments)
  },
})

test('does not show conditional release tab when feature not enabled', function () {
  ENV.CONDITIONAL_RELEASE_SERVICE_ENABLED = false
  const view = this.editView()
  equal(view.$el.find('#mastery-paths-editor').length, 0)
  equal(view.$el.find('#discussion-edit-view').hasClass('ui-tabs'), false)
})

test('shows disabled conditional release tab when feature enabled, but not assignment', function () {
  const view = this.editView()
  view.renderTabs()
  view.loadConditionalRelease()
  equal(view.$el.find('#mastery-paths-editor').length, 1)
  equal(view.$discussionEditView.hasClass('ui-tabs'), true)
  equal(view.$discussionEditView.tabs('option', 'disabled'), true)
})

test('shows enabled conditional release tab when feature enabled, and assignment', function () {
  const view = this.editView({withAssignment: true})
  view.renderTabs()
  view.loadConditionalRelease()
  equal(view.$el.find('#mastery-paths-editor').length, 1)
  equal(view.$discussionEditView.hasClass('ui-tabs'), true)
  equal(view.$discussionEditView.tabs('option', 'disabled'), false)
})

test('enables conditional release tab when changed to assignment', function () {
  const view = this.editView()
  view.loadConditionalRelease()
  view.renderTabs()
  equal(view.$discussionEditView.tabs('option', 'disabled'), true)
  view.$useForGrading.prop('checked', true)
  view.$useForGrading.trigger('change')
  equal(view.$discussionEditView.tabs('option', 'disabled'), false)
})

test('disables conditional release tab when changed from assignment', function () {
  const view = this.editView({withAssignment: true})
  view.loadConditionalRelease()
  view.renderTabs()
  equal(view.$discussionEditView.tabs('option', 'disabled'), false)
  view.$useForGrading.prop('checked', false)
  view.$useForGrading.trigger('change')
  equal(view.$discussionEditView.tabs('option', 'disabled'), true)
})

test('renders conditional release tab content', function () {
  const view = this.editView({withAssignment: true})
  view.loadConditionalRelease()
  equal(view.$conditionalReleaseTarget.children().size(), 1)
})

test('has an error when a title is 257 chars', function () {
  const view = this.editView({withAssignment: true})
  const errors = nameLengthHelper(view, 257, false, 30, '1')
  equal(errors.title[0].message, 'Title is too long, must be under 257 characters')
})

test('allows discussion to save when a title is 256 chars, MAX_NAME_LENGTH is not required and post_to_sis is true', function () {
  const view = this.editView({withAssignment: true})
  const errors = nameLengthHelper(view, 256, false, 30, '1')
  equal(errors.length, 0)
})

test('has an error when a title > MAX_NAME_LENGTH chars if MAX_NAME_LENGTH is custom, required and post_to_sis is true', function () {
  const view = this.editView({withAssignment: true})
  const errors = nameLengthHelper(view, 40, true, 30, '1')
  equal(errors.title[0].message, 'Title is too long, must be under 31 characters')
})

test('allows discussion to save when title > MAX_NAME_LENGTH chars if MAX_NAME_LENGTH is custom, required and post_to_sis is false', function () {
  const view = this.editView({withAssignment: true})
  const errors = nameLengthHelper(view, 40, true, 30, '0')
  equal(errors.length, 0)
})

test('allows discussion to save when title < MAX_NAME_LENGTH chars if MAX_NAME_LENGTH is custom, required and post_to_sis is true', function () {
  const view = this.editView({withAssignment: true})
  const errors = nameLengthHelper(view, 30, true, 40, '1')
  equal(errors.length, 0)
})

test('conditional release editor is updated on tab change', function () {
  const view = this.editView({withAssignment: true})
  view.renderTabs()
  view.renderGroupCategoryOptions()
  view.loadConditionalRelease()
  const stub = sandbox.stub(view.conditionalReleaseEditor, 'updateAssignment')
  view.$discussionEditView.tabs('option', 'active', 1)
  ok(stub.calledOnce)
  stub.reset()
  view.$discussionEditView.tabs('option', 'active', 0)
  view.onChange()
  view.$discussionEditView.tabs('option', 'active', 1)
  ok(stub.calledOnce)
})

test('validates conditional release', function (assert) {
  const resolved = assert.async()
  const view = this.editView({withAssignment: true})
  return defer(() => {
    sandbox.stub(view.conditionalReleaseEditor, 'validateBeforeSave').returns('foo')
    const errors = view.validateBeforeSave(view.getFormData(), {})
    strictEqual(errors.conditional_release, 'foo')
    return resolved()
  })
})

test('calls save in conditional release', function (assert) {
  const resolved = assert.async()
  const view = this.editView({withAssignment: true})
  return defer(() => {
    const superPromise = $.Deferred().resolve({}).promise()
    const crPromise = $.Deferred().resolve({}).promise()
    const mockSuper = sinon.mock(EditView.__super__)
    mockSuper.expects('saveFormData').returns(superPromise)
    const stub = sandbox.stub(view.conditionalReleaseEditor, 'save').returns(crPromise)
    const finalPromise = view.saveFormData()
    return finalPromise.then(() => {
      mockSuper.verify()
      ok(stub.calledOnce)
      return resolved()
    })
  })
})

test('does not call conditional release save for an announcement', function (assert) {
  const resolved = assert.async()
  const view = this.editView({isAnnouncement: true})
  return defer(() => {
    const superPromise = $.Deferred().resolve({}).promise()
    const mockSuper = sinon.mock(EditView.__super__)
    mockSuper.expects('saveFormData').returns(superPromise)
    const savePromise = view.saveFormData()
    return savePromise.then(() => {
      mockSuper.verify()
      notOk(view.conditionalReleaseEditor)
      return resolved()
    })
  })
})

test('switches to conditional tab if save error contains conditional release error', function (assert) {
  const resolved = assert.async()
  const view = this.editView({withAssignment: true})
  return defer(() => {
    view.$discussionEditView.tabs('option', 'active', 0)
    view.showErrors({
      foo: {type: 'bar'},
      conditional_release: {type: 'bat'},
    })
    equal(view.$discussionEditView.tabs('option', 'active'), 1)
    return resolved()
  })
})

test('switches to details tab if save error does not contain conditional release error', function (assert) {
  const resolved = assert.async()
  const view = this.editView({withAssignment: true})
  return defer(() => {
    view.$discussionEditView.tabs('option', 'active', 1)
    view.showErrors({
      foo: {type: 'bar'},
      baz: {type: 'bat'},
    })
    equal(view.$discussionEditView.tabs('option', 'active'), 0)
    return resolved()
  })
})

test('Does not change the locked status of an existing discussion topic', function () {
  const view = this.editView({}, {locked: true})
  equal(view.model.get('locked'), true)
})

QUnit.module('EditView: Assignment External Tools', {
  setup() {
    fakeENV.setup({})
    this.server = sinon.fakeServer.create()
    sandbox.fetch.mock('path:/api/v1/courses/1/lti_apps/launch_definitions', 200)
  },

  teardown() {
    this.server.restore()
    fakeENV.teardown()
  },

  editView() {
    return editView.apply(this, arguments)
  },
})

test('it attaches assignment external tools component in course context', function () {
  ENV.context_asset_string = 'course_1'
  const view = this.editView()
  equal(view.$AssignmentExternalTools.children().size(), 1)
})

test('it does not attach assignment external tools component in group context', function () {
  ENV.context_asset_string = 'group_1'
  const view = this.editView()
  equal(view.$AssignmentExternalTools.children().size(), 0)
})

test('it renders assignment external tools on announcements page when assignment_edit_placement_not_on_announcements flag is on', function () {
  const view = this.editView({isAnnouncement: true})
  equal(view.$AssignmentExternalTools.children().size(), 0)
})

test('it does not render assignment external tools on announcements page when assignment_edit_placement_not_on_announcements flag is off', function () {
  const view = this.editView({isAnnouncement: false})
  equal(view.$AssignmentExternalTools.children().size(), 0)
})
