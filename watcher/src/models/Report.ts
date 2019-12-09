import { Model } from 'objection'
import { EventStatus } from '../types';
import Event from './Event';

export default class Report extends Model {
  readonly eventId: number;
  readonly status: number;
  readonly lastError: string;

  get Status(): EventStatus {
    return this.status as EventStatus
  }

  static get tableName() {
    return 'reports';
  }

  static get idColumn() {
    return 'eventId';
  }

  static relationMappings = {
    event: {
      relation: Model.HasOneRelation,
      modelClass: Event,
      join: {
        from: 'reports.eventId',
        to: 'events.id'
      }
    }
  };
}