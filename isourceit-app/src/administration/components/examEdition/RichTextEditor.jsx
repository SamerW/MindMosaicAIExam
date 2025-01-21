import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import MyEditor from 'my-ckeditor/build/ckeditor'; // eslint-disable-line import/no-unresolved
import rteStyle from './RichTextEditor.scss';

function RichTextEditor({
  value, onChange, placeholder, id, className, required, validated,
}) {
  const cl = classNames(
    className,
    {
      'border border-danger': required && (validated === true || validated === null) && !value,
    },
    rteStyle.RichTextEditor,
  );

  return (
    <div className={cl}>
      <CKEditor
        id={id}
        className={className}
        editor={MyEditor}
        config={{
          placeholder,
          
        }}
        data={value}
        onChange={(event, editor) => {
          onChange(editor.getData());
        }}
        style={{ height: '300px', 'overflow-y': 'auto' }}
      />
    </div>
  );
}





RichTextEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.node,
  required: PropTypes.bool,
  validated: PropTypes.bool,
};

RichTextEditor.defaultProps = {
  placeholder: null,
  id: 'answerInputId',
  className: null,
  required: false,
  validated: null,
};

export default observer(RichTextEditor);
