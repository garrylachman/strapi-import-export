import './style.css';
import React from 'react';
import { ReactCodeMirrorProps } from '@uiw/react-codemirror';
export declare const Editor: ({ content, language, readOnly, onChange, style }: {
    content?: string | object;
    language?: string;
    readOnly?: boolean;
    onChange?: ReactCodeMirrorProps["onChange"];
    style?: React.CSSProperties;
}) => import("react/jsx-runtime").JSX.Element;
