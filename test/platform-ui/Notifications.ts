import { DataTable } from '@cucumber/cucumber';
import { contain, endsWith, Ensure, equals, includes, isPresent, startsWith } from '@serenity-js/assertions';
import { Check, Duration, List, MetaQuestionAdapter, QuestionAdapter, Task, Wait } from '@serenity-js/core';
import { DeleteRequest, GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { By, Click, Enter, isVisible, PageElement, PageElements, Switch, Text, Value } from '@serenity-js/web';

import { ImportManagement } from './ImportManagement';
import { TableView } from './TableView';

const NOTIFICATION = 'Notification';

interface NotificationList {
    results: Array<NotificationDetails>;
}

interface NotificationDetails {
    'id': number,
    'name': string,
    'description': string,
    'type': string,
    'contentType': string,
    'destinations': string,
    'lastTriggered': string,
    'triggeredBy': string
}

export const Notifications = {

    API: {
        getAll: () =>
            Task.where(`#actor gets all Notification configs`,
                Send.a(GetRequest.to(`/api/Notification/config?pageSize=1000`)),
                Ensure.that(LastResponse.status(), equals(200)),
            ),

        delete: (notificationId: number) =>
            Task.where(`#actor deletes Notification config with ID ${notificationId}`,
                Send.a(DeleteRequest.to(`/api/Notification/config/${notificationId}`)),
                Ensure.that(LastResponse.status(), equals(200)),
            ),

        deleteAllWithName: (name: string) =>
            Task.where(`#actor deletes all Notification configs with name ${name}`,
                Notifications.API.getAll(),
                List.of(LastResponse.body<NotificationList>().results)
                    .forEach(({ actor, item }) =>
                        actor.attemptsTo(
                            Check.whether(item.name, equals(name))
                                .andIfSo(
                                    Notifications.API.delete(item.id),
                                )
                        )
                    ),
            ),
    },

    openList: () =>
        Task.where(`#actor opens the Notifications list`,
            Click.on(Management.link()),
            TableView.waitForTable(NOTIFICATION),
        ),

    triggerEmailNotificationToDefaultRecipients: (emailType: string, mailData: DataTable) =>
        Task.where(`#actor triggers the Email notification to default recipients`,
            Click.on(Management.tab('CONFIG')),
            Wait.upTo(Duration.ofSeconds(5)).until(
                Management.Actions.menuButtons()
                    .first(),
                isPresent()
            ),
            Click.on(Management.Actions.menuButtonFor(emailType)),
            Click.on(Management.Actions.actionItem('Run Test')),
            List.of(mailData.hashes()).forEach(({ actor, item }) =>
                actor.attemptsTo(
                    Check.whether(item.field, startsWith('data.metrics.'))
                        .andIfSo(
                            RunTest.DataMetric.set(item.field, item.value)
                        )
                        .otherwise(
                            RunTest.Parameter.set(item.field, item.value)
                        )
                )
            ),
            Check.whether(emailType, equals('Example: HTML Email'))
                .andIfSo(
                    Click.on(RunTest.DataMetric.addButton())
                ),
        ),

    triggerEmailNotification: (emailType: string, recipient: string, mailData: DataTable) =>
        Task.where(`#actor triggers the Email notification to a named recipient`,
            Notifications.triggerEmailNotificationToDefaultRecipients(emailType, mailData),
            Enter.theValue(recipient)
                .into(RunTest.emailOverride()),
        ),

    sendEmail: () =>
        Task.where(`#actor sends the email notification`,
            Click.on(RunTest.sendEmailButton()),
        ),

    createNotificationConfiguration: (template: string, recipient: string, data: DataTable) =>
        Task.where(`#actor creates a new notification configuration`,
            Click.on(Management.tab('CONFIG')),
            Click.on(Config.createButton()),
            List.of(data.hashes()).forEach(({ actor, item }) =>
                actor.attemptsTo(
                    Config.Setters[item.field](item.value)
                )
            ),
            Config.Template.setFileLocation(template),
            Enter.theValue(recipient)
                .into(Config.Email.overrideValue()),
            Click.on(Config.Email.addButton()),
            Wait.until(Config.Email.addedAddress(recipient),
                isPresent()),
            Click.on(Config.saveButton()),
        ),

    checkEmailIsListedInTemplate: (data: DataTable, recipient: string) =>
        Task.where(`#actor checks that ${recipient} is listed in the config template`,
            Click.on(Management.tab('CONFIG')),
            Management.openItem(data.rowsHash().Name),
            Ensure.eventually(
                Config.Email.addedAddress(recipient),
                isPresent()
            ),
        ),

    verifyEmailNotificationInFeed: (mailType: string, mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor verifies the ${mailType} notification in the feed`,
            Feed.openFirstEmailNotification(mailType),
            CheckNotification[mailType](mailData),
        ),


};

const CheckNotification = {
    'Default Email': (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor verifies the Default Email notification in the feed`,
            NotificationContent.confirmEmailSenderIs(process.env.OP_USER),
            NotificationContent.confirmEmailTextMatches(mailData),
        ),
    'Example: HTML Email': (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor verifies the HTML Email notification in the feed`,
            NotificationContent.confirmEmailHtmlMatches(mailData),
        ),
    'Example: Teams Notification': (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor verifies the Teams notification in the feed`,
            NotificationContent.confirmTeamsHtmlMatches(mailData),
        ),
    'QA HTML Email': (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor verifies the QA HTML Email notification in the feed`,
            NotificationContent.confirmEmailHtmlMatches(mailData),
        ),
}

const Management = {
    link: () =>
        PageElement.located(By.cssContainingText(
            '.MuiDrawer-docked span',
            `${NOTIFICATION}s`))
            .describedAs(`${NOTIFICATION}s management link`),

    tab: (tabName: string) =>
        PageElement.located(By.cssContainingText(
            '.MuiTabs-scroller button',
            tabName))
            .describedAs(`${tabName} tab`),

    openItem: (name: string) =>
        Task.where(`#actor opens ${name} item`,
            TableView.openItemByName(name),
        ),

    name: () =>
        Text.of(PageElement.located(By.css(
            '[data-field="name"]')))
            .describedAs('notification name'),

    Actions: {
        menuButtons: () =>
            PageElements.located(By.css(
                '[data-field="actions"] [aria-haspopup="menu"]'))
                .describedAs('actions button'),

        menuButtonFor: (notificationName: string) =>
            Management.Actions.menuButtons()
                .of(TableView.dataRows()
                    .where(Management.name(),
                        equals(notificationName)
                    ).first()
                ).first()
                .describedAs(`actions button for ${notificationName}`),

        actionItem: (actionName: string) =>
            PageElement.located(By.cssContainingText(
                '[role="menuitem"]',
                actionName))
                .describedAs(`${actionName} action item`),

    },

}

const InputForm = {
    dialog: () =>
        PageElement.located(By.css('[role="dialog"]'))
            .describedAs('Run Test dialog'),

    inputContainers: () =>
        PageElements.located(By.css('.MuiFormControl-root'))
            .describedAs('Run Test form input containers'),

    inputLabelText: () =>
        Text.of(PageElement.located(By.css('.MuiInputBase-formControl'))
            .describedAs('Run Test form input label text')),

    dropdowns: () =>
        PageElements.located(By.role('combobox'))
            .of(InputForm.dialog())
            .describedAs('Run Test dropdowns'),

    labelledDropdown: (label: string) =>
        InputForm.dropdowns()
            .of(InputForm.inputContainers()
                .where(InputForm.inputLabelText(),
                    includes(label))
                .first())
            .first()
            .describedAs(`form dropdown for ${label}`),

    option: (optionText: string) =>
        PageElement.located(By.cssContainingText(
            '[role="option"]',
            optionText))
            .describedAs(`form option for ${optionText}`),

    textInputs: () =>
        PageElements.located(By.css(
            'input[type="text"]'))
            .of(InputForm.dialog())
            .describedAs('text inputs'),

    labelledTextInput: (label: string) =>
        InputForm.textInputs()
            .of(InputForm.inputContainers()
                .where(InputForm.inputLabelText(),
                    startsWith(label))
                .first())
            .first()
            .describedAs(`text input for ${label}`),
}

const RunTest = {

    Parameter: {
        rows: () =>
            PageElements.located(By.css('.MuiPaper-root .MuiBox-root'))
                .of(InputForm.dialog())
                .describedAs('parameter row'),

        row: (key: string) =>
            RunTest.Parameter.rows()
                .where(Value.of(
                    InputForm.textInputs()
                        .first()), equals(key)
                )
                .first()
                .describedAs(`parameter row for ${key}`),

        key: (key: string) =>
            PageElement.located(By.css(
                `input[value="${key}"]`))
                .describedAs(`parameter key for ${key}`),

        value: (key: string) =>
            InputForm.textInputs()
                .of(RunTest.Parameter.row(key))
                .last()
                .describedAs(`parameter value for ${key}`),

        set: (key: string, value: string) =>
            Task.where(`#actor sets parameter ${key} to ${value}`,
                Wait.upTo(Duration.ofSeconds(5)).until(
                    InputForm.dialog(),
                    isVisible()
                ),
                Wait.upTo(Duration.ofSeconds(5)).until(
                    RunTest.Parameter.key(key),
                    isPresent()
                ),
                Enter.theValue(value)
                    .into(RunTest.Parameter.value(key)),
            ),
    },

    DataMetric: {
        set: (key: string, value: string) =>
            Task.where(`#actor sets data metric ${key} to ${value}`,
                Enter.theValue(value)
                    .into(InputForm.labelledTextInput(
                        key.replace('data.metrics.', '')
                    ))
            ),

        addButton: () =>
            PageElement.located(By.cssContainingText(
                'button',
                'Add Row'))
                .describedAs('add data metrics button'),
    },

    emailOverride: () =>
        PageElement.located(By.css(
            'input[placeholder="email@example.com"]'))
            .describedAs('email override'),

    sendEmailButton: () =>
        PageElement.located(By.cssContainingText(
            'button',
            'Send'))
            .describedAs('send email button'),

}

const Config = {

    createButton: () =>
        PageElement.located(By.cssContainingText(
            'button',
            'Create Config'))
            .describedAs('create configuration button'),

    Setters: {
        'Name': (value: string) =>
            Task.where(`#actor sets Name to ${value}`,
                Enter.theValue(value).into(InputForm.labelledTextInput('Name'))
            ),
        'Description': (value: string) =>
            Task.where(`#actor sets Description to ${value}`,
                Enter.theValue(value).into(PageElement.located(By.role('textbox', { name: 'Description' }))
                    .of(InputForm.dialog())
                    .describedAs('description input'),
                ),
            ),
        'Type': (value: string) =>
            Task.where(`#actor sets Type to ${value}`,
                Click.on(InputForm.labelledDropdown('Type')),
                Click.on(InputForm.option(value)),
            ),
        'Content Type': (value: string) =>
            Task.where(`#actor sets Content Type to ${value}`,
                Click.on(InputForm.labelledDropdown('Content Type')),
                Click.on(InputForm.option(value)),
            ),
    },

    Template: {
        setFileLocation: (template: string) =>
            Task.where(`#actor sets template file location to ${template}`,
                ImportManagement.setImportFileLocation(template),
                Wait.until(Config.Template.uploadedTemplate(template), isPresent()),
            ),

        uploadedTemplate: (template: string) =>
            PageElement.located(By.cssContainingText(
                'p',
                template))
                .of(InputForm.dialog())
                .describedAs('uploaded template'),
    },

    Email: {
        overrideValue: () =>
            PageElement.located(By.css('input[placeholder="Enter email address"]'))
                .of(InputForm.dialog())
                .describedAs('config email override'),

        addButton: () =>
            PageElement.located(By.cssContainingText(
                'button',
                'Add'))
                .of(InputForm.dialog())
                .describedAs('config add email button'),

        addedAddress: (email: string) =>
            PageElement.located(By.cssContainingText(
                '.MuiChip-root',
                email))
                .describedAs('config added email address'),
    },

    saveButton: () =>
        PageElement.located(By.cssContainingText(
            'button',
            'SAVE'))
            .of(InputForm.dialog())
            .describedAs('save configuration button'),
}

const Feed = {
    configItems: (configItem: string) =>
        PageElements.located(By.css(`[data-id] > [data-field="${configItem}"]`))
            .describedAs(`${configItem} in feed`),

    openFirstEmailNotification: (mailType: string) =>
        Task.where(`#actor opens the ${mailType} notification`,
            Click.on(Management.tab('FEED')),
            Ensure.eventually(
                Text.of(Feed.configItems('configName').first()),
                equals(mailType)
            ),
            Ensure.eventually(
                Text.of(Feed.configItems('status').first()),
                equals(`Success`)
            ),
            Click.on(Management.Actions.menuButtons()
                .first()),
            Click.on(Management.Actions.actionItem('View Content')),
        ),
}

const NotificationContent = {

    confirmEmailSenderIs: (expectedSender: string) =>
        Task.where(`#actor confirms that the email sender is ${expectedSender}`,
            Confirm(
                NotificationContent.emailSender())
                .includes(expectedSender),
        ),

    confirmEmailTextMatches: (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor confirms that the email matches expected data`,
            Switch.to(NotificationContent.dialog()).and(
                ConfirmAllOf(
                    NotificationContent.AllEmailText())
                    .includesAllOf(mailData),
                Ensure.eventually(
                    NotificationContent.AllEmailText(),
                    contain('Sent by OctaiPipe')
                ),
            ),
        ),

    confirmEmailHtmlMatches: (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor confirms that the email HTML matches expected data`,
            Switch.to(NotificationContent.dialog()).and(
                Confirm(
                    NotificationContent.html())
                    .includesAllOf(mailData),
            ),
        ),

    confirmTeamsHtmlMatches: (mailData: List<{ field: string; value: string }>) =>
        Task.where(`#actor confirms that the Teams HTML matches expected data`,
            Switch.to(NotificationContent.dialog()).and(
                mailData.forEach(({ actor, item }) =>
                    actor.attemptsTo(
                        Check.whether(item.value, endsWith(':00Z'))
                            .andIfSo(
                                Confirm(
                                    NotificationContent.html())
                                    .includes(item.value.replace(/T/, ' ').replace(/Z/, ''))
                            )
                            .otherwise(
                                Confirm(
                                    NotificationContent.html())
                                    .includes(item.value)
                            )
                    )
                )
            ),
        ),

    dialog: () =>
        PageElement.located(By.deepCss('iframe'))
            .describedAs('notification content dialog'),

    emailSender: () =>
        Text.of(PageElement.located(By.css('[role="dialog"] p'))
            .describedAs('email sender in notification content')),

    AllEmailText: () =>
        Text.ofAll(PageElements.located(By.deepCss('td > div'))
            .of(PageElements.located(By.css('table')).first())
            .describedAs('notification text contents')),

    html: () =>
        PageElement.located(By.deepCss('body'))
            .html()
            .describedAs('notification html contents'),

}

const Confirm = (actualContents: QuestionAdapter<string>) => {
    return {
        includes: (expectedContent: string) =>
            Task.where(`#actor confirms that the notification content includes ${expectedContent}`,
                Ensure.eventually(
                    actualContents,
                    includes(expectedContent)
                ),
            ),
        includesAllOf: (expectedContents: List<{ field: string; value: string }>) =>
            Task.where(`#actor confirms that the notification content includes all expected contents`,
                expectedContents.forEach(({ actor, item }) =>
                    actor.attemptsTo(
                        Confirm(actualContents)
                            .includes(item.value)
                    )
                ),
            ),
    }
}

const ConfirmAllOf = (actualContents: MetaQuestionAdapter<PageElement<any>, string[]>) => {
    return {
        includesAllOf: (expectedContents: List<{ field: string; value: string }>) =>
            Task.where(`#actor confirms that the notification content includes all expected contents`,
                expectedContents.forEach(({ actor, item }) =>
                    actor.attemptsTo(
                        Ensure.eventually(
                            actualContents,
                            contain(item.value)
                        )
                    )
                ),
            ),
    }
}
