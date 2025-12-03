import { emit } from '@create-figma-plugin/utilities';
import React from 'react';
import { Link } from 'react-router-dom';
import { ResizeWindowHandler } from '../../types';

import './help.css';
import { Button } from 'baseui/button';
import { DisplayMedium } from 'baseui/typography';
import { HeadingXSmall } from 'baseui/typography';

const Help = () => {
    React.useEffect(() => {
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: 360, height: 513 });
    }, []);

    return (
        <div className="help-container">
            <div className="title-container">
                <DisplayMedium marginBottom="scale500" className="main-title">
                    Smart i18n
                </DisplayMedium>
                <HeadingXSmall className="sub-title">Figma Translator for CIS</HeadingXSmall>
            </div>

            <Link to="/">
                <Button className="button-container">Get Started</Button>
            </Link>
        </div>
    );
};

export default Help;
