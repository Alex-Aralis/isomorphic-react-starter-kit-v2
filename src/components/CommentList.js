import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux';
import PostComment from './PostComment';
import CommentForm from './CommentForm';
//redux
import { user } from 'actions';

class CommentList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      comment: '',
      comments: []
    }
  }
  componentDidMount() {
    fetch(`/api/v1/comment/${this.props.id}`)
      .then(res => res.json())
      .then((json) => {
        this.setState({
          comments: json
        })
      })
      .catch(err => console.error(err));
  }

  handleCommentChange(e) {
    this.setState({comment: e.target.value});
  }

  handleComment(commentTxt){
    fetch('/api/v1/comment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify( {
        comment: {
          _creator: this.props.user.toJS().id,
          content: this.state.comment,
          likes: 0,
          _codeversation: this.props.id
        }
      })
    })
      .then(data => data.json())
      .then((json) => {
        console.log(this.props);
        console.log(json);
        const newComment = [{
          content: this.state.comment,
          _creator: {
            email: this.props.user.toJS().email
          }
        }];
        this.setState({
          comment: '',
          comments: this.state.comments.concat(newComment)
        });
      })
      .catch((err) => {
        console.error(err)
        alert('Error posting your comment.');
      });

    return;

  }

  render() {
    return (
      <div>
        <h2>Comments</h2>
        {this.state.comments.map((comment, ind) => {
          return (
            <PostComment
              poster={comment._creator.email}
              content={comment.content}
              key={ind}
            />
          );
        })}
        <CommentForm
          postComment={this.handleComment.bind(this)}
          comment={this.state.comment}
          codeversationId={this.props.id}
          onCommentChange={this.handleCommentChange.bind(this)}
        />
      </div>
    );
  }
};

const mapStateToProps = ({ user }) => ({user});
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CommentList);
