let state = {
  sessionId: null,
  questionId: null,
  isOpen: false,
  timer: null
}

function openQuestion(sessionId, questionId, durationMs, onTimeout) {
  clearTimeout(state.timer)
  state.sessionId = sessionId
  state.questionId = questionId
  state.isOpen = true
  state.timer = setTimeout(() => {
    state.isOpen = false
    state.timer = null
    onTimeout(questionId)
  }, durationMs)
  console.log(`[State] Question ${questionId} open for ${durationMs}ms`)
}

function closeQuestion() {
  clearTimeout(state.timer)
  state.timer = null
  state.isOpen = false
  console.log(`[State] Question ${state.questionId} closed`)
}

function isAccepting(sessionId, questionId) {
  return (
    state.isOpen &&
    state.sessionId === sessionId &&
    state.questionId === questionId
  )
}

function getState() {
  return { ...state, timer: undefined }
}

module.exports = { openQuestion, closeQuestion, isAccepting, getState }