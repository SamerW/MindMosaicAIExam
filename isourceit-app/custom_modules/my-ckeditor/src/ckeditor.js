/**
 * @license Copyright (c) 2014-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor.js';
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat.js';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote.js';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold.js';
import Code from '@ckeditor/ckeditor5-basic-styles/src/code.js';
import CodeBlock from '@ckeditor/ckeditor5-code-block/src/codeblock.js';
import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials.js';
import FontBackgroundColor from '@ckeditor/ckeditor5-font/src/fontbackgroundcolor.js';
import FontColor from '@ckeditor/ckeditor5-font/src/fontcolor.js';
import Heading from '@ckeditor/ckeditor5-heading/src/heading.js';
import Indent from '@ckeditor/ckeditor5-indent/src/indent.js';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic.js';
import Link from '@ckeditor/ckeditor5-link/src/link.js';
import List from '@ckeditor/ckeditor5-list/src/list.js';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice.js';
import Table from '@ckeditor/ckeditor5-table/src/table.js';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar.js';
import TextTransformation from '@ckeditor/ckeditor5-typing/src/texttransformation.js';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import SimpleUploadAdapter from '@ckeditor/ckeditor5-upload/src/adapters/simpleuploadadapter';
import ImageUpload from '@ckeditor/ckeditor5-upload'

class Editor extends ClassicEditor {}

// Plugins to include in the build.
Editor.builtinPlugins = [
	Autoformat,
	BlockQuote,
	Bold,
	Code,
	CodeBlock,
	Essentials,
	FontBackgroundColor,
	FontColor,
	Heading,
	Indent,
	Italic,
	Link,
	List,
	Paragraph,
	PasteFromOffice,
	Table,
	TableToolbar,
	TextTransformation,
	ImageBlock,
	ImageCaption,
	ImageInline,
	ImageInsert,
	ImageInsertViaUrl,
	ImageResize,
	ImageStyle,
	ImageTextAlternative,
	ImageToolbar,
	ImageUpload,
];

// Editor configuration.
Editor.defaultConfig = {
	toolbar: {
		items: [
			'heading',
			'|',
			'bold',
			'italic',
			'link',
			'bulletedList',
			'numberedList',
			'fontColor',
			'fontBackgroundColor',
			'|',
			'code',
			'codeBlock',
			'|',
			'outdent',
			'indent',
			'|',
			'blockQuote',
			'insertTable',
			'undo',
			'redo',
			'insertImage',
		]
	},
	language: 'en',
	simpleUpload: {
        uploadUrl: 'http://localhost:5000/upload', // Replace with your backend upload endpoint
    },
	table: {
		contentToolbar: [
			'tableColumn',
			'tableRow',
			'mergeTableCells'
		]
	}
};

export default Editor;
