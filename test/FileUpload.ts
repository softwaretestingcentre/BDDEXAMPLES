import type { Answerable, AnswersQuestions, UsesAbilities } from '@serenity-js/core';
import { d } from '@serenity-js/core';
import type { Path } from '@serenity-js/core/lib/io';
import { PlaywrightPageElement } from '@serenity-js/playwright';
import { PageElement, PageElementInteraction } from '@serenity-js/web';

export class UploadFile extends PageElementInteraction {
    static from(pathToFile: Answerable<Path>): { to: (pageElement: Answerable<PageElement>) => UploadFile } {
        return {
            to: (pageElement: Answerable<PageElement>) => new UploadFile(pathToFile, pageElement),
        }
    }

    constructor(
        private readonly pathToFile: Answerable<Path>,
        private readonly pageElement: Answerable<PageElement>,
    ) {
        super(d`#actor uploads file from ${ pathToFile } to ${ pageElement }`);
    }

    async performAs(actor: UsesAbilities & AnswersQuestions): Promise<void> {
        const element: PlaywrightPageElement = await this.resolve(actor, this.pageElement);
        const pathToFile = await actor.answer(this.pathToFile);

        const nativeElement = await element.nativeElement();
        
        await nativeElement.setInputFiles(pathToFile.value);
    }
}