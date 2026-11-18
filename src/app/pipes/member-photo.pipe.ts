import { inject, Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { MemberPhotoService } from '@/app/services/member-photo.service';

/**
 * Turns an uploads URL into a URL that an `<img>` can show with the user's token.
 * Use it with `async`: `[src]="url | memberPhoto | async"`.
 */
@Pipe({ name: 'memberPhoto', standalone: true })
export class MemberPhotoPipe implements PipeTransform {
  private photos = inject(MemberPhotoService);

  transform(url: string | null | undefined): Observable<string> {
    return this.photos.load(url);
  }
}
