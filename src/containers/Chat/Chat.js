/* @flow */
'use strict'

import React, { Component } from 'react'
import { findDOMNode } from 'react-dom'
import { connect } from 'react-redux'
import { Router, RouterContext } from 'react-router'
import { find, trim } from 'lodash'
import moment from 'moment'

import { FirebaseDB } from '../../core/firebase'

import { fetchMessages, newMessage } from '../../actions/messages'

import type { Dispatch } from '../../actions/types'
import type { Message as MessageType } from '../../reducers/messages'

import HeaderBar from '../../components/HeaderBar'
import Message from '../../components/Message'
import Symbol from '../../components/UI/Symbol'
import Input from '../../components/UI/Input'


type Props = {
  currentUser: string,
  dispatch: Dispatch,
  messages: Array<MessageType>,
  router: Router,
}

type State = {
  isFetching: boolean,
  newMessage: string,
  clear: boolean,
}


class Chat extends Component {
  props: Props
  state: State

  constructor(props: Props) {
    super(props)

    this.state = {
      isFetching: true,
      newMessage: '',
      clear: false,
    }

    const Chat = (this: any)
    Chat.onSendMessage = this.onSendMessage.bind(this)

    Chat.messagesRef = FirebaseDB.ref().child('messages')
  }

  /* Component Lifecycle */

  /// Mounting

  componentWillMount() {
    const { currentUser, router } = this.props

    if ( currentUser === '' ) {
      router.replace('/')
    } else {
      const messagesRef = (this: any).messagesRef

      // NOTE: add real-time listener for new messages and save them to messages store
      messagesRef.on('child_added', (snapshot: Object) => {
        const message = snapshot.val()

        // NOTE: only trigger for data changes after initial data loaded
        if ( this.state.isFetching ) return

        const messageId = snapshot.key
        if ( ! find(this.props.messages, { id: messageId }) ) {
          const messageData = {
            id: messageId,
            ...message
          }
          this.props.dispatch( newMessage(messageData) )
        }
      })

      // NOTE: initially fetch all messages from firebase if there are no messages in store yet
      if ( ! this.props.messages.length ) {
        messagesRef
          .once('value')
          .then((snapshot: Object) => {
            const messages = snapshot.val()

            const migratedMessages = []
            for ( const messageId in messages ) {
              const message = {
                id: messageId,
                ...messages[messageId]
              }
              migratedMessages.push(message)
            }

            this.props.dispatch( fetchMessages(migratedMessages) )
          })
          .then(() => this.setState({ isFetching: false }))
          .catch((error) => {
            // add some error handling
            console.debug(error)
          })
      } else {
        this.setState({ isFetching: false })
      }
    }
  }

  componentDidMount() {
    this.scrollIntoView()

    const Chat = (this: any)
    const NewMessageInput = findDOMNode(Chat.NewMessageInput)
    NewMessageInput.querySelector('input').focus()
  }

  // componentWillUnmount() {}

  /// Updating
  // componentWillReceiveProps(nextProps: Props) {}
  // shouldComponentUpdate(nextProps: Props, nextState: State) {}
  // componentWillUpdate(nextProps: Props, nextState: State) {}
  componentDidUpdate(prevProps: Props, prevState: State) {
    if ( prevState.newMessage === this.state.newMessage) {
      this.scrollIntoView()

      if (this.state.clear) {
        this.setState({
          newMessage: '',
          clear: false,
        })
      }
    }
  }


  render() {
    const { currentUser, messages, router } = this.props
    const { isFetching, newMessage } = this.state

    return (
      <div id="Chat">
        <HeaderBar
          title="chat"
          leftItem={{
            icon: 'ion-coffee',
            onClick: () => router.goBack(),
          }}
        />

        <div className="content">
          { ! isFetching
            ? messages.map((message, index) => {
                const isOwnMessage = message.name == currentUser

                const prevMessage = messages[index-1]
                const showDetails = ! prevMessage
                  || prevMessage.name !== message.name

                return (
                  <Message
                    data={message}
                    own={isOwnMessage}
                    showDetails={showDetails}
                    key={index}
                  />
                )
              })
            : <div className="text-align-center">Loading messages ...</div>
          }
          <div className="timeline"></div>
        </div>

        <div ref={(ref) => (this: any).ScrollPointer = ref} />

        <div className="new-message column-center">
          <Input
            ref={(ref) => (this: any).NewMessageInput = ref}
            className="full-width"
            disabled={isFetching}
            placeholder="what do you want to say ?"
            maxLength={100}
            value={newMessage}
            onChange={(event: Object) => {
              this.setState({
                newMessage: event.target.value,
              })
            }}
            onSubmit={this.onSendMessage}
          />
        </div>
      </div>
    )
  }


  scrollIntoView() {
    const Chat = (this: any)
    const ScrollPointer = findDOMNode(Chat.ScrollPointer)
    // ScrollPointer.scrollTop = ScrollPointer.scrollHeight;
    ScrollPointer.scrollIntoView();
  }


  /// Event Handlers

  onSendMessage() {
    const { currentUser, dispatch } = this.props

    const message = {
      name: currentUser,
      text: trim(this.state.newMessage),
      createdAt: moment().unix(),
    }

    const Chat = (this: any)
    Chat.messagesRef.push(message)

    this.setState({
      clear: true,
    })

    this.scrollIntoView()
  }
}

const mapStateToProps = (state: Object, routerContext: RouterContext) => {
  // console.log('Chat mapStateToProps:')
  // console.log('  state: ', state)
  // console.log('  routerContext: ', routerContext)

  return {
    currentUser: state.main.user,
    messages: state.messages,
    router: routerContext.router,
  }
}

export default connect(
  mapStateToProps
  // mapDispatchToProps
)(Chat)
