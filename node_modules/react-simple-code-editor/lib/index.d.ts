import * as React from 'react';
declare type Padding<T> = T | {
    top?: T;
    right?: T;
    bottom?: T;
    left?: T;
};
declare type Record = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};
declare type History = {
    stack: (Record & {
        timestamp: number;
    })[];
    offset: number;
};
declare const Editor: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    highlight: (value: string) => string | React.ReactNode;
    ignoreTabKey?: boolean | undefined;
    insertSpaces?: boolean | undefined;
    onValueChange: (value: string) => void;
    padding?: Padding<string | number> | undefined;
    style?: React.CSSProperties | undefined;
    tabSize?: number | undefined;
    value: string;
    autoFocus?: boolean | undefined;
    disabled?: boolean | undefined;
    form?: string | undefined;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    name?: string | undefined;
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement> | undefined;
    onClick?: React.MouseEventHandler<HTMLTextAreaElement> | undefined;
    onFocus?: React.FocusEventHandler<HTMLTextAreaElement> | undefined;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement> | undefined;
    onKeyUp?: React.KeyboardEventHandler<HTMLTextAreaElement> | undefined;
    placeholder?: string | undefined;
    readOnly?: boolean | undefined;
    required?: boolean | undefined;
    textareaClassName?: string | undefined;
    textareaId?: string | undefined;
    preClassName?: string | undefined;
} & React.RefAttributes<{
    session: {
        history: History;
    };
}>>;
export default Editor;
