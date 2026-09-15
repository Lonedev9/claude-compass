import * as React from 'react';
import styles from './ExecutiveMessage.module.scss';
import { IExecutiveMessage } from '../../../../Service/models/IExecutiveMessage';

export interface IExecutiveMessageProps {
  message: IExecutiveMessage | undefined;
}

/**
 * Local copy, detached from ../../executiveMessage/components/ExecutiveMessage
 * (Task A). Pure decoupling - behavior identical to the original.
 */
const ExecutiveMessage: React.FC<IExecutiveMessageProps> = ({ message }) => {
  if (!message) {
    return null;
  }
  return (
    <div className={styles.executiveMessage}>
      {message.PhotoUrl && <img className={styles.photo} src={message.PhotoUrl} alt={message.ExecutiveName} />}
      <div className={styles.body}>
        <p className={styles.text}>{message.Message}</p>
        <div className={styles.byline}>
          <span className={styles.name}>{message.ExecutiveName}</span>
          <span className={styles.execTitle}>{message.ExecutiveTitle}</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveMessage;
