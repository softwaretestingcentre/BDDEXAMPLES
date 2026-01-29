import { Ensure, equals, isPresent, startsWith } from '@serenity-js/assertions';
import { Actor, Answerable, Check, Duration, Interaction, List, Question, Task, Wait } from '@serenity-js/core';
import { Attribute, By, Click, Enter, isVisible, PageElement, PageElements, Select, Text } from '@serenity-js/web';

export const TableView = {

    waitForTable: (entityName: string) =>
        Task.where(`#actor waits for the ${entityName}s table to be present`,
            Wait.upTo(Duration.ofSeconds(5))
                .until(
                    Text.of(TableView.title()), equals(`${entityName}s`),
                ),
            Wait.upTo(Duration.ofSeconds(30))
                .until(
                    TableView.listTable(), isPresent()
                ),
        ),

    safeClick: (element: Answerable<PageElement<any>>) =>
        // filter is flaky, so we try to click twice OCTA3-315
        Interaction.where(`#actor safely clicks on ${element.toString()}`, async (actor: Actor) => {
            const actualElement = await actor.answer(element);
            try {
                await actualElement.click();
            } catch {
                await actualElement.click();
            }
        }),

    openFilterMenu: () =>
        Task.where(`#actor opens the filter menu`,
            TableView.safeClick(TableView.filterMenu()),
            Wait.upTo(Duration.ofSeconds(5))
                .until(
                    TableView.filterInput(), isVisible()
                ),
        ),

    filterByNamedAttributes: (attributes: { name: string; value: string }[]) =>
        Task.where(`#actor filters table by multiple attributes`,
            TableView.openFilterMenu(),
            List.of(attributes).forEach(({ actor, item }) =>
                actor.attemptsTo(
                    Select.option(item.name)
                        .from(TableView.filterColumnSelect()),
                    TableView.filterValueSelect(item.value),
                    Click.on(TableView.addFilter())
                )
            ),
            TableView.endFiltering(attributes[0].value),
        ),

    filterByDefaultAttribute: (attributeValue: string) =>
        Task.where(`#actor filters table by default attribute value "${attributeValue}"`,
            TableView.openFilterMenu(),
            TableView.filterValueSelect(attributeValue),
            TableView.endFiltering(attributeValue)
        ),

    endFiltering: (checkValue) =>
        Task.where(`#actor ends filtering`,
            Click.on(TableView.title()),
            Wait.upTo(Duration.ofSeconds(5))
                .until(
                    TableView.rowByName(checkValue), isVisible()
                ),
        ),

    filterRows: () =>
        PageElements.located(By.css('.MuiDataGrid-filterForm'))
            .describedAs('filter rows'),

    filterColumnSelect: () =>
        PageElements.located(By.css('select'))
            .nth(1)
            .of(TableView.filterRows()
                .last())
            .describedAs('filter column select'),

    filterValueSelect: (filterValue: string) =>
        Task.where(`#actor selects filter value "${filterValue}"`,
            Enter.theValue(filterValue)
                .into(TableView.filterInput()),
        ),

    openItemByName: (entityName: string) =>
        Task.where(`#actor opens ${entityName}`,
            Click.on(PageElement.located(By.cssContainingText(
                `[data-field="name"] > div`,
                entityName))
                .describedAs(`"${entityName}" table link`)
            ),
        ),

    openItem: (nameType: string, entityName: string) =>
        Task.where(`#actor opens ${entityName}`,
            TableView.openItemVersion(nameType, entityName, '1'),
        ),

    openItemVersion: (nameType: string, entityName: string, version: string) =>
        Task.where(`#actor opens ${entityName} Version ${version}`,
            Wait.upTo(Duration.ofSeconds(5))
                .until(
                    TableView.rowByVersion(entityName, version),
                    isPresent()
                ),
            Click.on(TableView.itemLink(nameType)
                .of(TableView.rowByVersion(entityName, version))),
        ),

    attributeValue: (itemName: string, attributeName: string) =>
        Question.about(`the ${attributeName} of RL environment ${itemName}`, async actor => {
            const itemRow = await actor.answer(TableView.rowByName(itemName));
            const itemRowIndex = await actor.answer(Attribute.called('data-rowindex').of(itemRow));
            return await actor.answer(
                Text.of(
                    TableView.cellValue(
                        itemRowIndex,
                        attributeName,
                        itemName
                    )
                ),
            );
        }),

    verifyDetailsInTable: (nameColumn: string, itemName: string, version: string, userOrType: string) =>
        Task.where(`#actor verifies that the RL environment ${itemName} has version ${version} in the table`,
            TableView.filterByNamedAttributes([
                { name: nameColumn, value: itemName },
                { name: 'Version', value: version }
            ]),
            TableView.verifyValueInTable(itemName, 'version', version),
            TableView.verifyValueInTable(itemName, 'createdBy', userOrType),
            TableView.verifyValueInTable(itemName, 'modelType', userOrType),
            TableView.verifyDateValueInTable(itemName, 'createdAt', new Date()),
            TableView.verifyDateValueInTable(itemName, 'savingTime', new Date()),
        ),

    verifyValueInTable: (itemName: string, dataField: string, expectedValue: string) =>
        Task.where(`#actor verifies that the table has ${dataField} value ${expectedValue}`,
            Check.whether(PageElement.located(By.css(`[data-field="${dataField}"]`)),
                isPresent())
                .andIfSo(
                    Ensure.eventually(
                        TableView.attributeValue(itemName, dataField),
                        equals(expectedValue)
                    ),
                ),
        ),

    verifyDateValueInTable: (itemName: string, dataField: string, expectedValue: Date) =>
        Task.where(`#actor verifies that the table has ${dataField} date value ${expectedValue}`,
            Check.whether(PageElement.located(By.css(`[data-field="${dataField}"]`)),
                isPresent())
                .andIfSo(
                    Ensure.eventually(
                        TableView.attributeValue(itemName, dataField),
                        startsWith(expectedValue.toISOString().split('T')[0])
                    ),
                ),
        ),

    filterMenu: () =>
        PageElement.located(By.css('.MuiDataGrid-toolbarContainer button[aria-label="Show filters"]'))
            .describedAs('filter menu button'),

    filterInput: () =>
        PageElement.located(By.css('input[placeholder="Filter value"]'))
            .of(TableView.filterRows().last())
            .describedAs('filter input field'),

    addFilter: () =>
        PageElement.located(By.cssContainingText('button', 'ADD FILTER'))
            .describedAs('add filter button'),

    title: () =>
        PageElement.located(By.css('h1'))
            .describedAs('page title'),

    entityLink: (entityName: string) =>
        PageElement.located(By.cssContainingText(`[data-id="${entityName}"] a`,
            entityName))
            .describedAs(`"${entityName}" table link`),

    listTable: () =>
        PageElement.located(By.css('.MuiDataGrid-root'))
            .describedAs(`list table`),

    dataRows: () =>
        PageElements.located(By.css('.MuiDataGrid-row'))
            .describedAs('table rows'),

    entityCount: () =>
        Text.of(PageElement.located(By.css('.MuiDataGrid-Container .MuiTablePagination-displayedRows')))
            .describedAs('entity count'),

    rowByName: (rowName: string) =>
        PageElements.located(By.cssContainingText('[role="row"]',
            rowName))
            .first()
            .describedAs(`row for ${rowName}`),

    linkById: (id: string) =>
        PageElement.located(By.css(`[role="row"][data-id="${id}"] a`))
            .describedAs(`link for ID ${id}`),

    rowByVersion: (entityName: string, version: string) =>
        PageElements.located(By.cssContainingText('[role="row"]',
            `${entityName}${version}`))
            .first()
            .describedAs(`row for version ${entityName} version ${version}`),

    itemLink: (nameType: string) =>
        PageElement.located(By.css(`[data-field="${nameType}"] a`))
            .describedAs(`"${nameType}" item link`),

    columnHeader: (columnName: string) =>
        PageElement.located(By.cssContainingText('[role="columnheader"] .MuiDataGrid-columnHeaderTitle',
            columnName))
            .describedAs(`"${columnName}" column header`),

    cellValue: (itemRowIndex: string, attributeName: string, itemName: string) =>
        PageElement.located(
            By.css(`[role="row"][data-rowindex="${itemRowIndex}"]>[data-field="${attributeName}"]`))
            .describedAs(`${attributeName} value for ${itemName}`)

};
