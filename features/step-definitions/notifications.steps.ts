import { DataTable, Then, When } from '@cucumber/cucumber';
import { Actor, List, notes } from '@serenity-js/core';

import { Notifications } from '../../test/platform-ui/Notifications';

When('{actor} sends {string} notification to {string}', async (actor: Actor, mailType: string, recipient: string, notificationData: DataTable) =>
    actor.attemptsTo(
        notes().set('NOTIFICATION_DATA', notificationData.hashes()),
        Notifications.openList(),
        Notifications.triggerEmailNotification(mailType, recipient, notificationData),
        Notifications.sendEmail(),
    )
);

Then('{actor} sees the {string} notification in the feed', async (actor: Actor, mailType: string) =>
    actor.attemptsTo(
        Notifications.openList(),
        Notifications.verifyEmailNotificationInFeed(
            mailType,
            List.of(notes().get('NOTIFICATION_DATA'))
        )
    )
);

When('{actor} creates a new {string} configuration to be sent to {string}', async (actor: Actor, template: string, recipient: string, data: DataTable) =>
    actor.attemptsTo(
        Notifications.API.deleteAllWithName(data.rowsHash().Name),
        Notifications.openList(),
        Notifications.createNotificationConfiguration(template, recipient, data),
        Notifications.checkEmailIsListedInTemplate(data, recipient)
    )
)

When('{actor} sends {string} notification', async (actor: Actor, mailType: string, notificationData: DataTable) =>
    actor.attemptsTo(
        notes().set('NOTIFICATION_DATA', notificationData.hashes()),
        Notifications.openList(),
        Notifications.triggerEmailNotificationToDefaultRecipients(mailType, notificationData),
        Notifications.sendEmail(),
    )
);
