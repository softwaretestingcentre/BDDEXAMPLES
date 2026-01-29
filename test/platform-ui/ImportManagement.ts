/* eslint-disable unicorn/prefer-string-replace-all */
import fs from 'node:fs';

import { containAtLeastOneItemThat, endsWith, Ensure, equals, includes, not } from '@serenity-js/assertions';
import { Check, Duration, Question, Task, Wait } from '@serenity-js/core';
import { Path } from '@serenity-js/core/lib/io';
import { By, Click, Enter, isVisible, Key, Page, PageElement, PageElements, Press, Text } from '@serenity-js/web';
import path from 'path';

import { UploadFile } from '../FileUpload';

export const ImportManagement = {

    createFromImport: (itemName: string, fileName: string, entityName: string, successMessage: string) =>
        Task.where(`#actor creates ${itemName} by importing ${fileName}`,
            Click.on(ImportManagement.importButton(entityName)),
            Check.whether(itemName, not(equals('')))
                .andIfSo(
                    Enter.theValue(itemName)
                        .into(ImportManagement.nameInput(entityName)),
                ),
            ImportManagement.confirmImport(
                itemName, 
                fileName, 
                entityName, 
                successMessage
            ),
        ),

    confirmImport: (itemName: string, fileName: string, entityName: string, successMessage: string) =>
        Task.where(`#actor confirms the import`,
            ImportManagement.setImportFileLocation(fileName),
            Ensure.eventually(
                Text.of(ImportManagement.validationMessage(entityName)),
                equals(successMessage)),
            Check.whether(itemName, not(equals('')))
                .andIfSo(
                    Click.on(ImportManagement.confirmImportButton()),
                )
        ),
    
    setImportFileLocation: (fileName: string) =>
        Task.where(`#actor sets the import file to ${fileName}`,
            UploadFile.from(
                Path.from(`${path.join(process.env.DATA_FOLDER || './data', fileName)}`))
                .to(ImportManagement.fileInput()),
        ),

    displayedVersion: () =>
        Question.about('the displayed version', async actor => {
            return await actor.answer(
                Page.current().executeScript(`
                    let versonLabel = arguments[0];
                    return versonLabel.nextSibling.textContent;
                `, PageElements.located(By.cssContainingText('p', 'Version')).first())
            );
        }),

    verifyDetails: (itemName: string, version: string, user: string, fileName: string) =>
        Task.where(`#actor verifies that ${itemName} has version ${version} created by ${user} and code from ${fileName}`,
            Ensure.eventually(
                PageElement.located(By.cssContainingText('h2', itemName)),
                isVisible()
            ),
            Ensure.eventually(
                ImportManagement.displayedVersion(),
                equals(version)
            ),
            Ensure.eventually(
                Text.of(PageElements.located(By.cssContainingText('div', `Created By`)).last()),
                endsWith(user)
            ),
            Ensure.eventually(
                Text.of(PageElements.located(By.cssContainingText('div', `Created At`)).last()),
                includes(new Date().getFullYear().toString())
            ),
            ImportManagement.reduceEditorFontSize(),
            Ensure.eventually(
                ImportManagement.codeContent(),
                equals(ImportManagement.fileContentOf(fileName))
            ),
        ),

    reduceEditorFontSize: () =>
        Task.where(`#actor reduces the code editor font size`,
            // use the command palette to run the 'reduce font size' command twice
            // so that all the code is visible without scrolling
            Click.on(ImportManagement.codeBlock()),
            Press.the(Key.F1)
                .in(ImportManagement.codeBlock()),
            Press.the('d', 'e', 'c', Key.Enter)
                .in(ImportManagement.commandPalette()),
            Press.the(Key.F1)
                .in(ImportManagement.codeBlock()),
            Press.the('d', 'e', 'c', Key.Enter)
                .in(ImportManagement.commandPalette()),
        ),

    fileContentOf: (fileName: string) =>
        Question.about(`the content of file ${fileName}`, async actor => {
            const filePath = path.join(process.env.DATA_FOLDER || './data', fileName);
            const fileCode = await actor.answer(fs.readFileSync(filePath).toString());
            return await actor.answer(
                fileCode
                    .replace(/\W+/g, ' ')
            );
        }),

    codeContent: () =>
        Question.about('the content of the code block', async actor => {
            return await actor.answer(
                Text.of(ImportManagement.codeBlock())
                    .replace(/\W+/g, ' ')
            );
        }),

    downloadItem: (itemName: string) =>
        Task.where(`#actor downloads ${itemName}`,
            Click.on(ImportManagement.downloadButton()),
            Wait.for(Duration.ofSeconds(5)),
        ),

    verifyDownloadedFileMatches: (fileName: string) =>
        Task.where(`#actor verifies that the downloaded item matches ${fileName}`,
            Ensure.that(
                fs.readFileSync(
                    path.join(process.env.DOWNLOAD_FOLDER || './downloads', 
                    fs.readdirSync(process.env.DOWNLOAD_FOLDER || './downloads')[0])
                ).toString(),
                equals(
                    fs.readFileSync(path.join(process.env.DATA_FOLDER || './data', fileName)).toString(),
                ),
            ),
        ),

    updateFromPage: (entityType: string, entityName: string, fileName: string, VALIDATION_SUCCESS_MESSAGE: string) =>
        Task.where(`#actor updates ${entityName} with ${fileName}`,
            Click.on(ImportManagement.updateButton(entityType)),
            UploadFile.from(
                Path.from(`${path.join(process.env.DATA_FOLDER || './data', fileName)}`))
                .to(ImportManagement.fileInput()),
            Ensure.eventually(
                Text.ofAll(ImportManagement.importMessages()),
                containAtLeastOneItemThat(
                    equals(VALIDATION_SUCCESS_MESSAGE)),
            ),
            Click.on(ImportManagement.updateButton(entityType)),
            Wait.upTo(Duration.ofSeconds(10)).until(
                ImportManagement.confirmUpdateMessage(entityName),
                isVisible(),
            ),
            Click.on(ImportManagement.confirmUpdateButton()),
        ),

    deleteItem: (itemType: string) =>
        Task.where(`#actor deletes the ${itemType}`,
            Click.on(ImportManagement.deleteButton()),
            Ensure.eventually(
                ImportManagement.confirmDeleteHeader(itemType),
                isVisible(),
            ),
            Ensure.eventually(
                ImportManagement.confirmDeleteMessage(itemType),
                isVisible(),
            ),
            Click.on(ImportManagement.confirmDeleteButton()),
            Wait.for(Duration.ofSeconds(5)),
        ),

    deleteButton: () =>
        PageElement.located(By.cssContainingText('button', 'Delete'))
            .describedAs('delete button'),

    confirmDeleteHeader: (itemType: string) =>
        PageElement.located(By.cssContainingText('[role="dialog"] h2',
            `Delete ${itemType.toLowerCase()}?`))
            .describedAs('confirm delete header'),

    confirmDeleteMessage: (itemName: string) =>
        PageElement.located(By.cssContainingText('[role="dialog"] p',
            `Are you sure you want to delete ${itemName}`))
            .describedAs('confirm delete message'),

    confirmDeleteButton: () =>
        PageElement.located(By.cssContainingText('[role="dialog"] button', 'Yes, delete'))
            .describedAs('confirm delete button'),

    downloadButton: () =>
        PageElement.located(By.cssContainingText('button', 'Download'))
            .describedAs('download button'),

    importButton: (entityName: string) =>
        PageElement.located(By.cssContainingText('button', `Import ${entityName}`))
            .describedAs(`import ${entityName} button`),

    importMessages: () =>
        PageElements.located(By.css('.MuiAlert-message'))
            .describedAs(`all import messages`),

    nameInput: (entityName: string) =>
        PageElement.located(By.css('input[type="text"]'))
            .describedAs(`${entityName} name input`),

    fileInput: () =>
        PageElement.located(By.css('input[type="file"]'))
            .describedAs(`file input`),

    validationMessage: (entityName: string) =>
        PageElements.located(By.css('.MuiAlert-message')).first()
            .describedAs(`${entityName} validation message`),

    confirmImportButton: () =>
        PageElement.located(By.cssContainingText('button', 'Import'))
            .describedAs('import button'),

    codeBlock: () =>
        PageElement.located(By.css('.view-lines'))
            .describedAs('code block'),

    commandPalette: () =>
        PageElement.located(By.css('[aria-describedby="quickInput_message"]'))
            .describedAs('code editor command palette'),

    updateButton: (entityName: string) =>
        PageElements.located(By.cssContainingText('button', `Update ${entityName}`)).last()
            .describedAs(`update ${entityName} button`),

    confirmUpdateMessage: (entityName: string) =>
        PageElement.located(By.cssContainingText('[role="dialog"] p',
            `This will create a new version of ${entityName}. Continue?`))
            .describedAs(`confirm update ${entityName} message`),

    confirmUpdateButton: () =>
        PageElement.located(By.cssContainingText('[role="dialog"] button', 'Yes'))
            .describedAs(`confirm update button`),

    updatedVersionLink: () =>
        PageElement.located(By.cssContainingText('.MuiAlert-action a', 'View'))
            .describedAs('updated version link'),
}
