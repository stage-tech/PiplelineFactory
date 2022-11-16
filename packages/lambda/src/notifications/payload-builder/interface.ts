import { NotificationPayload } from '../../models';

export interface INotificationsPayloadBuilder {
  buildNotificationPayload(): Promise<NotificationPayload>;
}
