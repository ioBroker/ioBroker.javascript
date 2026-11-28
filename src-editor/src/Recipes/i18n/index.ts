import { I18n } from '@iobroker/gui-components';

import en from './en.json';
import de from './de.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import nl from './nl.json';
import pl from './pl.json';
import pt from './pt.json';
import ru from './ru.json';
import uk from './uk.json';
import zhCn from './zh-cn.json';

/**
 * The texts of the recipes come with their chunk and not with the application, like those of the
 * diagram editor. The few that are shown before the chunk is loaded (the bar in "Add new script", the
 * toolbar button "Export as recipe") are in the texts of the application.
 */
const translations: Partial<Record<ioBroker.Languages, Record<string, string>>> = {
    en,
    de,
    es,
    fr,
    it,
    nl,
    pl,
    pt,
    ru,
    uk,
    'zh-cn': zhCn,
};

Object.entries(translations).forEach(([lang, words]) => I18n.extendTranslations(words, lang as ioBroker.Languages));
