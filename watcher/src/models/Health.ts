import { Model } from 'objection'
import { EventStatus } from '../types';
import Event from './Event';

export default class Health extends Model {
  readonly id: number;
  readonly lastReviewedEventId: number;

  static get tableName() {
    return 'health';
  }

  static get idColumn() {
    return 'id';
  }

  static relationMappings = {
    event: {
      relation: Model.HasOneRelation,
      modelClass: Event,
      join: {
        from: 'health.lastReviewedEventId',
        to: 'events.id'
      }
    }
  };
}